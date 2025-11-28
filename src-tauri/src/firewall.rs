use anyhow::{ anyhow, Result };
use std::io::{ BufRead, BufReader, Write };
use std::process::{ Child, ChildStdin, ChildStdout, Command, Stdio };
use std::sync::{ Arc, Mutex };

#[derive(Clone)]
pub struct IptablesShell {
    stdin: Arc<Mutex<ChildStdin>>,
    stdout: Arc<Mutex<BufReader<ChildStdout>>>,
    _child: Arc<Child>,
}

impl IptablesShell {
    pub fn new() -> Result<Self> {
        let mut child = Command::new("pkexec")
            .arg("bash")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|e| anyhow!("failed to start pkexec shell: {}", e))?;

        let stdin = child.stdin.take().ok_or_else(|| anyhow!("failed to get stdin"))?;
        let stdout = child.stdout.take().ok_or_else(|| anyhow!("failed to get stdout"))?;
        let reader = BufReader::new(stdout);

        Ok(Self {
            stdin: Arc::new(Mutex::new(stdin)),
            stdout: Arc::new(Mutex::new(reader)),
            _child: Arc::new(child),
        })
    }

    fn run_cmd(&self, cmd: &str) -> Result<String> {
        let mut stdin = self.stdin.lock().unwrap();
        let mut stdout = self.stdout.lock().unwrap();
        println!("{}", cmd);
        let marker = "END_OF_CMD";
        writeln!(stdin, "{}; echo {}", cmd, marker)?;
        stdin.flush()?;

        let mut output = String::new();
        let lines_iter = (&mut *stdout).lines();
        for line_result in lines_iter {
            let line: String = line_result?;
            if line == marker {
                break;
            }
            output.push_str(&line);
            output.push('\n');
        }

        Ok(output)
    }

    pub fn list_rules(&self, table: &str, chain: &str) -> Result<Vec<String>> {
        let out = self.run_cmd(&format!("iptables -t {} -L {} -n --line-numbers", table, chain))?;
        Ok(
            out
                .lines()
                .map(|s| s.to_string())
                .collect()
        )
    }

    pub fn add_rule(&self, table: &str, chain: &str, rule: &str) -> Result<()> {
        self.run_cmd(&format!("iptables -t {} -A {} {}", table, chain, rule))?;
        Ok(())
    }

    pub fn delete_rule(&self, table: &str, chain: &str, line: &str) -> Result<()> {
        self.run_cmd(&format!("iptables -t {} -D {} {}", table, chain, line))?;
        Ok(())
    }
}
