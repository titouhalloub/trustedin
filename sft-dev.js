// sft-dev.js
import { exec } from "child_process";
import chalk from "chalk";

process.env.PATH = `${process.cwd()}\\node_modules\\.bin;${process.env.PATH}`;

const tasks = [
  { name: "Type Check", command: "tsc --noEmit" },
  { name: "Lint", command: "npx eslint ." },
  { name: "Build", command: "next build" },
  { name: "Tests", command: "jest --passWithNoTests" }
];

let results = [];

function runTask(task) {
  return new Promise((resolve) => {
    console.log(chalk.blue(`\n▶ Running: ${task.name}...\n`));
    exec(task.command, (error, stdout, stderr) => {
      if (error) {
        console.log(chalk.red(`❌ ${task.name} failed`));
        if (stderr) console.log(chalk.gray(stderr));
        if (stdout) console.log(chalk.gray(stdout));
        results.push({ name: task.name, success: false });
      } else {
        console.log(chalk.green(`✅ ${task.name} passed`));
        results.push({ name: task.name, success: true });
      }
      resolve();
    });
  });
}

async function runAll() {
  for (const task of tasks) {
    await runTask(task);
  }

  console.log(chalk.yellow("\n─────────────── SUMMARY ───────────────"));
  results.forEach((r) => {
    console.log(
      r.success ? chalk.green(`✔ ${r.name}`) : chalk.red(`✖ ${r.name}`)
    );
  });
  console.log(chalk.yellow("───────────────────────────────────────\n"));

  const failed = results.some((r) => !r.success);
  process.exit(failed ? 1 : 0);
}

runAll();
