/* Codder plugin calls special Codder routes to send submissions and receive
 * evaluations. Registers external "Codder" that handles this process.
 */

function run_codder(submission, callback) {
  // Codder external that sends a message to the Codder plugin and updates
  // grade with a reply.
  window.setTimeout(function () {
  callback(
    [
      {
        "item": submission.task + ".part1",
        "category": "note",
        "severity": "info",
        "description": "This is a test...",
        "adjust": +10
      }
    ]
  );
  }, 3000);
}


register_plugin(
  "Codder",
  function (continuation) {
    // Add codder as an external
    EXTERNALS["Codder"] = run_codder;

    // Continue
    continuation();
  }
);
