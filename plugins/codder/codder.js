function run_codder(submission, notes) {
  // Codder external that sends a message to the Codder plugin and updates
  // grade with a reply.
  notes.push(
    {
      "item": "task1",
      "category": "note",
      "severity": "info",
      "description": "This is a test...",
      "adjust": +10
    }
  );
}

// Add codder as an external
EXTERNALS['Codder'] = run_codder;
