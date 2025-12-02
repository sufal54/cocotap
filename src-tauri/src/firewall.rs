use anyhow::{ anyhow, Result };
use std::io::{ BufRead, BufReader, Write };
use std::process::{ Child, ChildStdin, ChildStdout, Command, Stdio };
use std::sync::{ Arc, Mutex };

#[derive(Clone)]
pub struct PkexecShell {
    stdin: Arc<Mutex<ChildStdin>>, // stdin
    stdout: Arc<Mutex<BufReader<ChildStdout>>>, // stdout
    _child: Arc<Child>, // To alive child
}

impl PkexecShell {
    pub fn new() -> Result<Self> {
        // Create new Pkexec terminal
        let mut child = Command::new("pkexec")
            .arg("bash")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|e| anyhow!("failed to start pkexec shell: {}", e))?;

        let stdin = child.stdin.take().ok_or_else(|| anyhow!("failed to get stdin"))?;
        let stdout = child.stdout.take().ok_or_else(|| anyhow!("failed to get stdout"))?;
        // wrap stdout with Buffer-Reader
        let reader = BufReader::new(stdout);

        Ok(Self {
            stdin: Arc::new(Mutex::new(stdin)),
            stdout: Arc::new(Mutex::new(reader)),
            _child: Arc::new(child),
        })
    }

    // Execution of command
    fn run_cmd(&self, cmd: &str) -> Result<String> {
        let mut stdin = self.stdin.lock().unwrap();
        let mut stdout = self.stdout.lock().unwrap();
        let marker = "END_OF_CMD"; // Mark of command ends
        writeln!(stdin, "{}; echo {}", cmd, marker)?;
        stdin.flush()?; // Flush the stdio

        let mut output = String::new();
        let lines_iter = (&mut *stdout).lines();
        for line_result in lines_iter {
            let line: String = line_result?;
            // Triger the end
            if line == marker {
                break;
            }
            output.push_str(&line);
            output.push('\n');
        }

        Ok(output)
    }

    // List of rules on table and chain
    pub fn list_rules(&self, table: &str, chain: &str) -> Result<Vec<String>> {
        let out = self.run_cmd(&format!("iptables -t {} -L {} -n --line-numbers", table, chain))?;
        Ok(
            out
                .lines()
                .map(|s| s.to_string())
                .collect()
        )
    }
    // Add rules
    pub fn add_rule(&self, table: &str, chain: &str, rule: &str) -> Result<()> {
        self.run_cmd(&format!("iptables -t {} -A {} {}", table, chain, rule))?;
        Ok(())
    }
    // Delete rule by number
    pub fn delete_rule(&self, table: &str, chain: &str, line: &str) -> Result<()> {
        self.run_cmd(&format!("iptables -t {} -D {} {}", table, chain, line))?;
        Ok(())
    }
}
