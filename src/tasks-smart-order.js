
const bus = require("hermes-bus");
const fs = require('fs');

const requireL = require("root-require")("./src/require-local.js");
const {NOT_COMPLETED_WITH_FAILING_TESTS} = requireL("exitcodes");
const console_log = requireL("logging").logger("console");
const {statusTypes} = requireL("tasks");
const {FAILED} = statusTypes;

bus.on("registerCommandlineArguments", (parser) => {
	parser.addArgument(
		['--read-report'],
		{
			dest: 'inputReportFile',
			metavar: 'FILE',
			help: `Use the report from a previous run to determine a smart order
				in which the tasks should run. Also terminates next-swarm when a
				slave is lost on a test that already crashed during the previous
				run.`,
		}
	);
	parser.addArgument(
		['--retry-strategy'],
		{
			dest: 'retryStrategy',
			metavar: 'STRATEGY',
			help: `Set the retry strategy to use in case a task lost all of its
				slaves during a previous run of next-swarm. (This option only
				works in conjuntion with --read-report) Allowed values for
				STRATEGY are: NORMAL - proceed as normal, i.e. allow for 3 lost
				slaves per task; TERMINATE - immediately terminate next-swarm if
				now, again, a slave is lost; FAIL - mark this task as failed but
				continue with the other tasks. Default is TERMINATE`,
		}
	);
});

let retryStrategy = "TERMINATE";
let reportOfPreviousRun = [];
bus.on("commandlineArgumentsParsed", (args) => {
	if(args.inputReportFile) {
		reportOfPreviousRun = JSON.parse(fs.readFileSync(args.inputReportFile, 'utf8'));
	} // CAVEAT REFACTOR: No 'else'

	if(args.retryStrategy) {
		retryStrategy = args.retryStrategy;
	}
});
const getPreviousTaskReport = (task) => reportOfPreviousRun.find((task2) => task.name === task2.name) || {};
const hasFailedPreviously = (task) => getPreviousTaskReport(task).status === FAILED;
bus.on("scheduleTasks", (tasks) => {
	// To guarantee that all components first receive the 'scheduleTasks' event:
	setTimeout(() => {
		bus.triggerTasksUpdated(tasks.sort((lhs, rhs) => {
			let result;
			const lhsFailed = hasFailedPreviously(lhs);
			const rhsFailed = hasFailedPreviously(rhs);
			const sameOutcome = lhsFailed === rhsFailed;

			if(sameOutcome) {
				result = lhs.name.localeCompare(rhs.name);
			} else {
				result = lhsFailed ? -1 : 1;
			}

			return result;
		}))
	}, 0);
});

// The following code terminates this next-swarm run
// immediately if a task causes us to lose a slave
// and the report of the previous run for this task
// states that in the previous run this task lost all
// its slaves (max number of recovery runs reached).
bus.on("taskUpdated", (task, propertyName) => {
	if(propertyName === 'numRecoveryRunsLeft' &&
		task.numRecoveryRunsLeft !== 0 &&
		getPreviousTaskReport(task).numRecoveryRunsLeft === 0
	) {
		if(/Terminate/i.test(retryStrategy)) {
			console_log("Detected bad test that keeps on losing slaves, bailing out...");
			bus.triggerRequestStopApplication({value: NOT_COMPLETED_WITH_FAILING_TESTS});
		} else if(/Normal/i.test(retryStrategy)) {
			// Proceed as normal
		} else if(/Fail/i.test(retryStrategy)) {
			task.numRecoveryRunsLeft = 0;
			task.completed = true;
		}
	}
});
