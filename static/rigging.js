var ROSTER = undefined;
var ASG_INFO = undefined;
var RUBRICS = {};
var FEEDBACK = {};
var SUBMISSIONS = {};

var POINTS = {};
var CURRENTLY_DISPLAYED = undefined;
var BASE_PATH = "static/content"
var ANY_DIRTY = false;
var SAVE_IN_FLIGHT = undefined;

// Callback queues
var QUEUES = {
  "roster": undefined,
  "asg_info": undefined,
  "rubrics": {},
  "feedback": {},
  "submissions": {}
};

var CATEGORIES = [
  "crash",
  "behavior",
  "implementation",
  "style",
  "adjust",
  "info"
];

var SEVERITIES = [
  'critical',
  'major',
  'minor',
  'pass',
  'credit',
  'adjustment',
  'note'
];

var CATEGORY_LEGEND = {
  'crash': 'serious issue that interferes with other checks',
  'behavior': 'code does not behave correctly when tested',
  'implementation': 'issue with the code itself',
  'style': 'style issue; breaks style guideline',
  'adjust': 'manual adjustment to your score; no particular category',
  'info': 'informational note; not an issue'
}

var SEVERITY_LEGEND = {
  'critical': 'a very serious issue; usually worth at least five points',
  'major': 'an important issue; usually worth one to three point(s)',
  'minor': 'not a big issue; worth less than one point',
  'pass': 'passes a test or check; zero points off',
  'credit': 'extra points; usually extra credit',
  'adjustment': 'manual adjustment to your grade',
  'note': 'just an informative note; not worth points'
}

/*
 * Get stuff going:
 */
window.onload = function() {
  // Test:
  // document.getElementById("evaluation").appendChild(weave(task1));

  with_asg_info(
    function (info) {
      init_controls(info);
      update_task_select();
    }
  );
}

/*
 * Do something with (possibly cached) assignment info.
 */
function with_asg_info(callback) {
  if (ASG_INFO) {
    callback(ASG_INFO);
  } else if (QUEUES.asg_info != undefined) {
    QUEUES.asg_info.push(callback);
  } else {
    QUEUES.asg_info = [callback];
    load_json(
      "assignments/index.json",
      function (json) {
        ASG_INFO = json;
        ASG_STATUS = {};
        for (let asg of ASG_INFO) {
          ASG_STATUS[asg.id] = {};
          for (let task of asg.tasks) {
            ASG_STATUS[asg.id][task] = {};
          }
        }
        for (let cb of QUEUES.asg_info) {
          cb(ASG_INFO);
        }
        delete QUEUES["asg_info"];
      }
    );
  }
}

/*
 * Do something with (possibly cached) roster
 */
function with_roster(callback) {
  if (ROSTER) {
    callback(ROSTER);
  } else if (
    QUEUES.roster != undefined
  ) {
    QUEUES.roster.push(callback);
  } else {
    QUEUES.roster = [callback];
    load_json(
      "roster.json",
      function (json) {
        ROSTER = json;
        for (let cb of QUEUES.roster) {
          cb(ROSTER);
        }
        // TODO: Make sure this isn't simultaneous with another with_roster
        // attempt to add to the roster queue?
        delete QUEUES["roster"];
      }
    );
  }
}

/*
 * Do something with (possibly cached) rubric
 */
function with_rubric(asg, task, callback) {
  if (!RUBRICS.hasOwnProperty(asg)) {
    RUBRICS[asg] = {};
  }
  if (RUBRICS[asg].hasOwnProperty(task)) {
    callback(RUBRICS[asg][task]);
  } else if (
    QUEUES.rubrics.hasOwnProperty(asg)
 && QUEUES.rubrics[asg].hasOwnProperty(task)
  ) {
    QUEUES.rubrics[asg][task].push(callback);
  } else {
    if (!QUEUES.rubrics.hasOwnProperty(asg)) {
      QUEUES.rubrics[asg] = {};
    }
    QUEUES.rubrics[asg][task] = [callback];
    load_json(
      "assignments/" + asg + "/" + task + "/rubric.json",
      function (json) {
        RUBRICS[asg][task] = json;
        let queue = QUEUES.rubrics[asg][task];
        for (let cb of queue) {
          cb(json);
        }
        delete QUEUES.rubrics[asg][task];
      }
    );
  }
}

function next_note_id(category) {
  /*
   * Determines the ID value to use when adding a new note to a category.
   */
  let id=0;
  let notes = category.notes;
  if (notes == undefined) {
    return "0";
  }
  while (notes.hasOwnProperty("" + id)) {
    id += 1;
  }
  return "" + id;
}

function lookup_category(rubric, addr) {
  /*
   * Returns the category object from a rubric corresponding to the dotted
   * category name given in 'addr'.
   */
  let names = addr.split('.');
  let here = rubric.category;
  if (names[0] != here.title) {
    return undefined;
  }
  for (let i = 1; i < names.length; ++i) {
    let next = undefined;
    for (let child of here.children) {
      if (child.title == names[i]) {
        next = child;
        break;
      }
    }
    if (next) {
      here = next;
    } else {
      return undefined;
    }
  }
  return here;
}

function lookup_note(rubric, addr, id) {
  let cat = lookup_category(rubric, addr);
  if (cat.notes == undefined) {
    return undefined;
  }
  if (cat.notes.hasOwnProperty(id)) {
    return cat.notes[id];
  } else {
    return undefined;
  }
}

/*
 * Do something with (possibly cached) student feedback
 */
function with_feedback(asg, task, student, callback) {
  if (!FEEDBACK.hasOwnProperty(asg)) {
    FEEDBACK[asg] = {};
  }
  if (!FEEDBACK[asg].hasOwnProperty(task)) {
    FEEDBACK[asg][task] = {};
  }
  if (FEEDBACK[asg][task].hasOwnProperty(student)) {
    callback(FEEDBACK[asg][task][student]);
  } else if (
    QUEUES.feedback.hasOwnProperty(asg)
 && QUEUES.feedback[asg].hasOwnProperty(task)
 && QUEUES.feedback[asg][task].hasOwnProperty(student)
  ) {
    QUEUES.feedback[asg][task][student].push(callback);
  } else {
    if (!QUEUES.feedback.hasOwnProperty(asg)) {
      QUEUES.feedback[asg] = {};
    }
    if (!QUEUES.feedback.hasOwnProperty(task)) {
      QUEUES.feedback[asg][task] = {};
    }
    QUEUES.feedback[asg][task][student] = [callback];
    let fbpath = "feedback/" + asg + "/" + student + "/" + task + ".json";
    load_json(
      fbpath,
      function (feedback) {
        FEEDBACK[asg][task][student] = feedback;
        for (let cb of QUEUES.feedback[asg][task][student]) {
          cb(feedback);
        }
        delete QUEUES.feedback[asg][task][student];
      },
      function(category, error) {
        let feedback = {
          "progress": "pre-fresh",
          "asg": asg,
          "task": task,
          "student": student,
          "overrides": {},
          "notes": {},
          "specific": []
        };
        FEEDBACK[asg][task][student] = feedback;
        for (let cb of QUEUES.feedback[asg][task][student]) {
          cb(feedback);
        }
        delete QUEUES.feedback[asg][task][student];
      }
    );
  }
}

/*
 * Do something with (possibly cached) student submission
 */
function with_submission(asg, task, student, callback) {
  if (!SUBMISSIONS.hasOwnProperty(asg)) {
    SUBMISSIONS[asg] = {};
  }
  if (!SUBMISSIONS[asg].hasOwnProperty(task)) {
    SUBMISSIONS[asg][task] = {};
  }
  if (SUBMISSIONS[asg][task].hasOwnProperty(student)) {
    callback(SUBMISSIONS[asg][task][student]);
  } else if (
    QUEUES.submissions.hasOwnProperty(asg)
 && QUEUES.submissions[asg].hasOwnProperty(task)
 && QUEUES.submissions[asg][task].hasOwnProperty(student)
  ) {
    QUEUES.submissions[asg][task][student].push(callback);
  } else {
    if (!QUEUES.submissions.hasOwnProperty(asg)) {
      QUEUES.submissions[asg] = {};
    }
    if (!QUEUES.submissions.hasOwnProperty(task)) {
      QUEUES.submissions[asg][task] = {};
    }
    QUEUES.submissions[asg][task][student] = [callback];

    with_rubric(
      asg,
      task,
      function (rubric) {
        with_feedback(
          asg,
          task,
          student, 
          function (feedback) {
            continue_loading_submission(
              asg,
              task,
              student,
              rubric,
              feedback
            );
          }
        );
      }
    );
  }
}

function continue_loading_submission(
  asg,
  task,
  student,
  rubric,
  feedback
) {
  let submission_info = {
    "status": "complete",
    "asg": asg,
    "task": task,
    "student": student,
    "rubric": rubric,
    "feedback": feedback,
    "filenames": rubric.submission_files.slice(),
    "files": []
  }
  for (let file of submission_info.filenames) {
    let path = "submissions/" + asg + "/" + student + "/" + file;
    load_text(
      path,
      function (text) {
        submission_info["files"][file] = {
          "filename": file,
          "submitted": true,
          "content": text
        };
        let all_defined = true;
        for (let file of rubric.submission_files) {
          if (submission_info["files"][file] == undefined) {
            all_defined = false;
            break;
          }
        }
        if (all_defined) {
          finalize_submission_info(
            asg,
            task,
            student,
            rubric,
            feedback,
            submission_info
          );
        }
      },
      function (category, error) {
        submission_info["files"][file] = {
          "filename": file,
          "submitted": false,
          "content": "File '" + file + "' not found."
        };
        let all_defined = true;
        for (let file of rubric.submission_files) {
          if (submission_info["files"][file] == undefined) {
            all_defined = false;
            break;
          }
        }
        if (all_defined) {
          finalize_submission_info(
            asg,
            task,
            student,
            rubric,
            feedback,
            submission_info
          );
        }
      }
    );
  }
}

function finalize_submission_info(
  asg,
  task,
  student,
  rubric,
  feedback,
  submission_info
) {
  let all_submitted = true;
  let none_submitted = true;
  for (let file of submission_info.filenames) {
    let sub = submission_info.files[file];
    if (sub.submitted == false) {
      all_submitted = false;
      if (feedback.progress == "pre-fresh") {
        feedback.specific.push(
          {
            "item": task,
            "category": "crash",
            "severity": "critical",
            "description": "We couldn't find your file '" + sub.filename + "'!",
            "adjust": -1000 // TODO: This value?!?
          }
        );
      }
    } else {
      none_submitted = false;
    }
  }
  if (!all_submitted && !none_submitted) {
    submission_info.status = "incomplete"
  } else if (none_submitted) {
    submission_info.status = "missing"
  }
  if (feedback.progress == "pre-fresh") {
    feedback.progress = "fresh";
  }
  SUBMISSIONS[asg][task][student] = submission_info;
  for (let cb of QUEUES.submissions[asg][task][student]) {
    cb(submission_info);
  }
  delete QUEUES.submissions[asg][task][student];
}


function load_file(path, callback, errorfn, mime_type) {
  let xobj = new XMLHttpRequest();
  if (mime_type) {
    xobj.overrideMimeType(mime_type);
  }
  let url = window.location.href;
  let base = url.substr(0, url.lastIndexOf('/'));
  let target = base + '/' + BASE_PATH + '/' + path;

  xobj.open("GET", target);
  xobj.onload = function() {
    let successful = (
      xobj.status == 200
   || (xobj.status == 0 && dpath.startsWith("file://"))
    );
    if (!successful) {
      if (errorfn) {
        errorfn("STATUS", xobj.status);
      } else {
        console.error(
          "Failed to load JSON from '" + path + "' (-> '" + target + "')"
        );
        console.error("Response code " + xobj.status);
      }
    } else {
      callback(xobj.responseText);
    }
  };
  xobj.onerror = function () {
    if (errorfn) {
      errorfn("REQUEST", undefined)
    } else {
      console.error(
        "Failed to load file '" + path + "' (-> '" + target + "')"
      );
    }
  }
  try {
    xobj.send(null);
  } catch (e) {
    if (errorfn) {
      errorfn("JAVASCRIPT", e)
    } else {
      console.error(
        "Failed to load file '" + path + "' (-> '" + target + "')"
      );
      console.error(e);
    }
  }
}

function upload_json(path, object, callback, errorfn) {
  let xobj = new XMLHttpRequest();
  let url = window.location.href;
  let base = url.substr(0, url.lastIndexOf('/'));
  let target = base + "/upload/" + path;

  xobj.open("POST", target);
  // TODO: Why don't these work?!?
  xobj.setRequestHeader("Content-Type", "applicaton/json;charset=UTF-8");
  xobj.overrideMimeType("application/json");
  xobj.onload = function() {
    let successful = (
      xobj.status == 200
   || (xobj.status == 0 && dpath.startsWith("file://"))
    );
    if (!successful) {
      if (errorfn) {
        errorfn("STATUS", xobj.status);
      } else {
        console.error(
          "Failed to upload JSON to '" + path + "' (-> '" + target + "')"
        );
        console.error("Response code " + xobj.status);
      }
    } else {
      callback(xobj.responseText);
    }
  };
  xobj.onerror = function () {
    if (errorfn) {
      errorfn("REQUEST", undefined)
    } else {
      console.error(
        "Failed to upload JSON to '" + path + "' (-> '" + target + "')"
      );
    }
  }
  try {
    xobj.send(JSON.stringify(object));
  } catch (e) {
    if (errorfn) {
      errorfn("JAVASCRIPT", e)
    } else {
      console.error(
        "Failed to upload JSON to '" + path + "' (-> '" + target + "')"
      );
      console.error(e);
    }
  }
}

function load_json(path, callback, errorfn) {
  load_file(
    path,
    function(string) {
      let json = undefined;
      try {
        json = JSON.parse(string);
      } catch (e) {
        if (errorfn) {
          errorfn("JSON", e);
        } else {
          console.error("Failed to parse JSON from '" + path + "':");
          console.error(string);
          console.error(e);
        }
      }
      if (json != undefined) {
        callback(json);
      }
    },
    errorfn,
    "application/json"
  );
}

function load_text(path, callback, errorfn) {
  load_file(
    path,
    callback,
    errorfn,
    "text/plain"
  );
}

function init_controls(asg_info) {
  let asg_select = document.getElementById("asg_select");
  asg_select.innerHTML = "";
  for (let asg of asg_info) {
    let opt = document.createElement("option");
    opt.value = asg.id;
    opt.innerHTML = asg.title;
    asg_select.appendChild(opt);
  }
  asg_select.addEventListener("change", select_assignment);

  let task_select = document.getElementById("task_select");
  task_select.addEventListener("change", select_task);

  let student_select = document.getElementById("student_select");
  student_select.addEventListener("change", select_student);

  let lock_rubric = document.getElementById("lock_rubric");
  let eval = document.getElementById("evaluation");
  lock_rubric.addEventListener(
    "click",
    function () {
      toggle_rubric_state(eval, !lock_rubric.checked);
    }
  );

  let save_button = document.getElementById("save_changes");
  save_button.addEventListener(
    "click",
    function () {
      document.body.appendChild(create_save_dialog());
    }
  );

  let dump_button = document.getElementById("dump_json");
  dump_button.addEventListener(
    "click",
    function () {
      document.body.appendChild(create_dump_dialog());
    }
  );

  let restore_button = document.getElementById("restore_from_json");
  restore_button.addEventListener(
    "click",
    function () {
      document.body.appendChild(create_restore_dialog());
    }
  );
}

function select_assignment(evt) {
  update_task_select(); // also triggers roster update
  update_which();
}

function select_task(evt) {
  update_roster();
  update_which();
}

function select_student(evt) {
  update_which();
}

function update_which() {
  let asg = get_current_assignment();
  let task = get_current_task();
  let student = get_current_student();
  if (asg && task && student) {
    if (
      CURRENTLY_DISPLAYED == undefined
   || CURRENTLY_DISPLAYED.asg != asg
   || CURRENTLY_DISPLAYED.task != task
   || CURRENTLY_DISPLAYED.student != student
    ) {
      with_submission(
        asg,
        task,
        student,
        function(submission) {
          display_submission(submission);
        }
      );
    }
  }
}

function refresh_display() {
  if (CURRENTLY_DISPLAYED == undefined) {
    return; // do nothing
  } else {
    let asg = CURRENTLY_DISPLAYED.asg;
    let task = CURRENTLY_DISPLAYED.task;
    let student = CURRENTLY_DISPLAYED.student;
    with_submission(
      CURRENTLY_DISPLAYED.asg,
      CURRENTLY_DISPLAYED.task,
      CURRENTLY_DISPLAYED.student,
      function (sub) {
        display_submission(sub);
      }
    );
  }
}

function display_submission(submission) {
  // Display the submission:
  CURRENTLY_DISPLAYED = submission;
  let sub_div = document.getElementById("submission");
  let sub_html = "";
  for (let file of submission.filenames) {
    // TODO: Some kind of no-diff message!
    let entry = submission.files[file];
    let missing = " file-missing";
    if (entry.submitted) {
      missing = ""
    }
    sub_html += (
      "<pre class='file-contents" + missing + "'>\n"
    + entry.content // TODO: Escape this?!? (also prettify!)
    + "</pre>\n"
    );
  }
  sub_div.innerHTML = sub_html;

  // Display the evaluation stuff:
  let eval_div = document.getElementById("evaluation");
  eval_div.innerHTML = "";
  eval_div.appendChild(weave(submission));
}

function get_current_assignment() {
  let asg_select = document.getElementById("asg_select");
  return asg_select.value;
}

function get_current_student() {
  let student_select = document.getElementById("student_select");
  return student_select.value;
}

function get_current_task() {
  let task_select = document.getElementById("task_select");
  return task_select.value;
}

function get_submission_status(asg, task, student) {
  if (!SUBMISSIONS.hasOwnProperty(asg)) {
    return "unknown";
  }
  if (!SUBMISSIONS[asg].hasOwnProperty(task)) {
    return "unknown";
  }
  if (!SUBMISSIONS[asg][task].hasOwnProperty(student)) {
    return "unknown";
  }
  let si = SUBMISSIONS[asg][task][student];
  if (!si.hasOwnProperty("status")) {
    return "unknown";
  }
  return si.status;
}

function get_eval_progress(asg, task, student) {
  if (!SUBMISSIONS.hasOwnProperty(asg)) {
    return "unknown";
  }
  if (!SUBMISSIONS[asg].hasOwnProperty(task)) {
    return "unknown";
  }
  if (!SUBMISSIONS[asg][task].hasOwnProperty(student)) {
    return "unknown";
  }
  let si = SUBMISSIONS[asg][task][student];
  if (!si.hasOwnProperty("feedback")) {
    return "unknown";
  }
  let fb = si["feedback"];
  if (!fb.hasOwnProperty("progress")) {
    return "unknown";
  }
  return fb.progress;
}

function get_asg_info(asg) {
  if (ASG_INFO == undefined) {
    return undefined;
  }
  for (let ai of ASG_INFO) {
    if (ai.id == asg) {
      return ai;
    }
  }
  return undefined;
}

function update_task_select() {
  let current_assignment = get_current_assignment();
  let task_select = document.getElementById("task_select");
  let old_sel = task_select.value;
  task_select.innerHTML = "";
  if (ASG_INFO && current_assignment) {
    let ai = get_asg_info(current_assignment);
    for (let task of ai["tasks"]) {
      let opt = document.createElement("option");
      opt.value = task;
      opt.innerHTML = task;
      task_select.appendChild(opt);
      if (task == old_sel) {
        opt.selected = "true";
      }
    }
  }
  update_roster();
}

function update_roster() {
  with_roster(
    function (roster) {
      let current_assignment = get_current_assignment();
      let current_task = get_current_task();
      let student_select = document.getElementById("student_select");
      let old_sel = student_select.value;
      student_select.innerHTML = "";
      let first_opt = undefined;
      for (let student of roster) {
        let opt = document.createElement("option");
        if (first_opt == undefined) {
          first_opt = opt;
        }
        opt.value = student.id;
        opt.innerHTML = student.name;
        if (student.id == old_sel) {
          opt.selected = "true";
        }
        student_select.appendChild(opt);
        if (current_assignment && current_task) {
          opt.classList.add(
            "status_" + get_submission_status(
              current_assignment,
              current_task,
              student.id
            )
          );
          opt.classList.add(
            "progress_" + get_eval_progress(
              current_assignment,
              current_task,
              student.id
            )
          );
        } else {
          opt.classList.add("status_unknown");
        }
      }
      // Trigger student selection (w/ fake event) if we didn't already have a
      // selection
      if (old_sel == "" && first_opt != undefined) {
        first_opt.selected = "true";
        select_student(undefined);
      }
    }
  );
}

function collapse_section(evt) {
  let button = evt.target;
  let parent = button.parentNode;

  parent.classList.add("collapsed");
  let children = parent.lastChild;
  if (node_has_class(children, "children")) {
    children.style.display = "none";
  }

  button.addEventListener("click", expand_section);
  button.removeEventListener("click", collapse_section);
  button.innerHTML = "+";
}

function expand_section(evt) {
  let button = evt.target
  let parent = button.parentNode;

  parent.classList.remove("collapsed");
  let children = parent.lastChild;
  if (node_has_class(children, "children")) {
    children.style.display = "inline";
  }

  button.addEventListener("click", collapse_section);
  button.removeEventListener("click", expand_section);
  button.innerHTML = "-";
}

function node_has_class(node, cls) {
  return (
    node.classList != undefined
 && node.classList.contains(cls)
  );
}

function get_common_subsection(section) {
  for (let child of section.childNodes) {
    if (node_has_class(child, "notes") && node_has_class(child, "common")) {
      return child;
    }
  }
  console.warn("Failed to find common subsection in section:");
  console.warn(section);
  return undefined;
}

function get_specific_subsection(section) {
  for (let child of section.childNodes) {
    if (node_has_class(child, "notes") && node_has_class(child, "specific")) {
      return child;
    }
  }
  console.warn("Failed to find specific subsection in section:");
  console.warn(section);
  return undefined;
}

function get_children_subsection(section) {
  for (let child of section.childNodes) {
    if (node_has_class(child, "children")) {
      return child;
    }
  }
  console.warn("Failed to find children subsection in section:");
  console.warn(section);
  return undefined;
}

function get_points_div(section) {
  for (let child of section.childNodes) {
    if (node_has_class(child, "points")) {
      return child;
    }
  }
  console.warn("Failed to find points div in section:");
  console.warn(section);
  return undefined;
}

function get_earned_input(section) {
  let pd = get_points_div(section);
  if (pd == undefined) {
    console.warn("No points div when looking for earned input.");
    return undefined;
  }
  for (let child of pd.childNodes) {
    if (node_has_class(child, "points-earned")) {
      return child;
    }
  }
  console.warn("Failed to find earned input in points div:");
  console.warn(pd);
  return undefined;
}

function get_worth_input(section) {
  let pd = get_points_div(section);
  if (pd == undefined) {
    console.warn("No points div when looking for worth input.");
    return undefined;
  }
  for (let child of pd.childNodes) {
    if (node_has_class(child, "points-worth")) {
      return child;
    }
  }
  console.warn("Failed to find worth input in points div:");
  console.warn(pd);
  return undefined;
}

function get_adjust_input(note_div) {
  // Remember to double-check return is not undefined
  let pd = get_points_div(note_div);
  if (pd == undefined) {
    console.warn("No points div when looking for adjust input.");
    return undefined;
  }
  for (let child of pd.childNodes) {
    if (node_has_class(child, "points-adjust")) {
      return child;
    }
  }
  // No warning here because info notes legitimately do not have adjust inputs.
  return undefined;
}

function get_toggle_checkbox(note_div) {
  for (let child of note_div.childNodes) {
    if (node_has_class(child, "toggle-button")) {
      return child;
    }
  }
  console.warn("Failed to find toggle checkbox in note:");
  console.warn(note_div);
  return undefined;
}

function get_category_title(section) {
  for (let child of section.childNodes) {
    if (node_has_class(child, "sec-title")) {
      return child;
    }
  }
  console.warn("Failed to find title span in section:");
  console.warn(section);
  return undefined;
}

function get_note_description(note_div) {
  for (let child of note_div.childNodes) {
    if (node_has_class(child, "note-description")) {
      return child;
    }
  }
  console.warn("Failed to find description span in note:");
  console.warn(note_div);
  return undefined;
}

function get_parent_obj(score_obj) {
  // Get parent of this score_obj using DOM hooks. Won't work pre-weave! Note:
  // it returns null for top-level score objects.
  let result = score_obj.node.parentNode.score_obj;
  return result;
}

function current_earned(node) {
  /*
   * Extracts earned points from a section div.
   */
  let points = node.firstChild;
  let pf = points.firstChild;
  if (pf == null) {
    return 0; // just a note
  } else {
    // An adjustment or category: either way earned comes first
    return parseFloat(pf.value);
  }
}

function current_worth(node) {
  /*
   * Extracts worth points from a section div.
   */
  let points = node.firstChild;
  let pl = points.lastChild;
  if (pl == null) {
    return 0; // just a note
  } else if (node_has_class(pl, "points-worth")) {
    // A category
    return parseFloat(pl.value);
  } else {
    // An adjustment
    return 0;
  }
}

function clear_points_cache() {
  /*
   * Clears out the points earned/worth cache entirely.
   */
  POINTS = {};
}

function cache_earned(student, addr, earned) {
  if (!POINTS.hasOwnProperty(student)) {
    POINTS[student] = {};
  }
  if (POINTS[student].hasOwnProperty(addr)) {
    POINTS[student][addr].earned = earned;
  } else {
    POINTS[student][addr] = { "earned": earned };
  }
}

function cache_worth(addr, worth) {
  if (POINTS.hasOwnProperty(addr)) {
    POINTS[addr].worth = worth;
  } else {
    POINTS[addr] = { "worth": worth };
  }
}

function compute_worth(addr, rubric, skip_cache) {
  if (skip_cache == undefined) {
    skip_cache = 0;
  }
  if (skip_cache <= 0) {
    skip_cache = 0;
  }
  if (
    skip_cache <= 0
 && POINTS.hasOwnProperty(addr)
 && POINTS[addr].hasOwnProperty("worth")
  ) {
    return POINTS[addr].worth;
  }
  let cat = lookup_category(rubric, addr);
  if (cat.worth != "") {
    if (typeof(cat.worth) != "number") {
      console.warn(
        "Warning: category '" + addr + "' has non-numeric non-empty worth '"
      + cat.worth + "'!"
      );
    }
    cache_worth(addr, cat.worth);
    return cat.worth;
  }
  let worth = 0;
  if (cat.children) {
    for (let child of cat.children) {
      worth += compute_worth(addr + "." + child.title, rubric, skip_cache - 1);
    }
  }
  cache_worth(addr, worth);
  return worth;
}

function is_overridden(addr, feedback) {
  return feedback.overrides.hasOwnProperty(addr);
}

function compute_earned(addr, rubric, feedback, skip_cache) {
  if (skip_cache == undefined) {
    skip_cache = 0;
  }
  if (skip_cache <= 0) {
    skip_cache = 0;
  }
  if (
    skip_cache <= 0
 && POINTS.hasOwnProperty(addr)
 && POINTS[addr].hasOwnProperty("earned")
  ) {
    return POINTS[addr].earned;
  }
  if (feedback.overrides.hasOwnProperty(addr)) {
    let result = feedback.overrides[addr];
    cache_earned(feedback.student, addr, result);
    return result;
  }
  // Look up the category and it's worth:
  let cat = lookup_category(rubric, addr);
  let worth = compute_worth(addr, rubric, skip_cache);

  // Figure out the default point value:
  let points = 0;
  if (cat.children) {
    // If you have children, start with the sum of their point values
    for (let child of cat.children) {
      points += compute_earned(
        addr + "." + child.title,
        rubric,
        feedback,
        skip_cache - 1
      );
    }
  } else {
    // Full points by default if you're a leaf category
    points = worth;
  }

  // Add in any adjustments from common notes:
  if (feedback.notes.hasOwnProperty(addr)) {
    for (let id of Object.keys(feedback.notes[addr])) {
      let note = lookup_note(rubric, addr, id);
      if (note == undefined) {
        console.warn("Missing note '" + id + "' in category '" + addr + "'");
      } else {
        if (note.adjust) {
          points += note.adjust;
        }
      }
    }
  }

  // Add in any adjustments from specific notes:
  for (let note of feedback.specific) {
    if (note.item == addr) {
      if (note.adjust && !note.disabled) {
        points += note.adjust;
      }
    }
  }
  if (points > worth) {
    points = worth;
  }
  if (points < 0) {
    points = 0;
  }
  cache_earned(feedback.student, addr, points);
  return points;
}

function refresh_points(section, skip_cache) {
  /*
   * Updates the points display for the section or note, recomputing point
   * values in subsections as a result.
   */
  if (skip_cache == undefined) {
    skip_cache = 0;
  }
  let addr = section.__address__;
  let rb = section.__rubric__;
  let fb = section.__feedback__;
  let points = compute_earned(addr, rb, fb, skip_cache);
  let overridden = is_overridden(addr, fb);
  let worth = compute_worth(addr, rb, skip_cache);

  let earned_input = get_earned_input(section);
  let worth_input = get_worth_input(section);

  // Set points value and indicate override status:
  earned_input.value = points;
  if (overridden) {
    earned_input.classList.add("overriden");
  } else {
    earned_input.classList.remove("overriden");
  }

  // Set worth value:
  worth_input.value = worth;
}

function propagate_points(section) {
  /*
   * Given a section whose earned or worth just changed, propagates those
   * changes upwards within the DOM tree. Uses a skip_cache of 1.
   */

  // Recompute points w/out using cached value:
  refresh_points(section, 1);

  // Propagate to parent section:
  let parent_section = section.parentNode.parentNode;
  if (node_has_class(parent_section, "section")) {
    // We're not at the top.
    propagate_points(parent_section);
  }
}

function mark_dirty(fb_or_rb) {
  fb_or_rb.dirty = "true";
  ANY_DIRTY = true;
  let fb_clean = document.getElementById("feedback_clean")
  fb_clean.innerText = "unsaved changes";
  fb_clean.classList.remove("data-clean");
  fb_clean.classList.add("data-dirty");
  if (!save_in_progress()) {
    document.getElementById("save_changes").disabled = false;
  }
}

function update_category_earned(section) {
  /*
   * Call on a section after its earned input has changed, and this function
   * will enter the appropriate override.
   */

  // Scoop up entered value:
  let earned_input = get_earned_input(section);
  let value = earned_input.value;
  let points = parseFloat(value);
  if (isNaN(points)) {
    earned_input.value = "";
    value = "";
    points = undefined;
  }

  // Get address and feedback object:
  let addr = section.__address__;
  let fb = section.__feedback__;

  // Update feedback override
  if (
    (value == "" && fb.overrides.hasOwnProperty(addr))
 || (value != "" && fb.overrides[addr] != points)
  ) {
    // Value is changing, so mark the feedback as dirty.
    mark_dirty(fb);
  }
  if (value == "") {
    delete fb.overrides[addr];
  } else {
    fb.overrides[addr] = points;
  }

  // Propagate changes upwards:
  propagate_points(section);
}

function update_category_worth(section) {
  /*
   * Call on a section after its worth input has changed, and this function
   * will update the rubric as appropriate.
   */

  // Scoop up entered value:
  let worth_input = get_worth_input(section);
  let value = worth_input.value;
  let points = parseFloat(value);
  if (isNaN(points)) {
    worth_input.value = "";
    value = "";
    points = undefined;
  }

  // Get address and feedback object:
  let addr = section.__address__;
  let rb = section.__rubric__;

  // Update rubric:
  let cat = lookup_category(rb, addr);
  if (
    (value == "" && cat.worth != "")
 || (value != "" && cat.worth != points)
  ) {
    // Value is changing, so mark the rubric as dirty.
    mark_dirty(rb);
  }

  if (value == "") {
    cat.worth = "";
  } else {
    cat.worth = points;
  }

  // Propagate changes upwards:
  propagate_points(section);

  // Mark the rubric object as dirty:
  mark_dirty(rb);
}

function update_note(note_div) {
  /*
   * Call on a note after its override check box has been toggled or its value
   * input has been edited, and this function will update the feedback as
   * appropriate.
   */

  // Check on toggle checkbox:
  let toggle_checkbox = get_toggle_checkbox(note_div);
  let toggled = toggle_checkbox.checked;

  // Get note title:
  let desc = get_note_description(note_div);

  // Scoop up entered value:
  let adjust_input = get_adjust_input(note_div);
  let value, points;
  if (adjust_input != undefined) {
    value = adjust_input.value;
    points = parseFloat(value);
    if (isNaN(points)) {
      adjust_input.value = "0";
      points = 0;
    }
  }

  // Get note object, section, address, and feedback object:
  let note = note_div.__note__;
  let id = note_div.__id__;
  let section = get_parent_section(note_div);
  let addr = section.__address__;
  let fb = section.__feedback__;
  let rb = section.__rubric__;

  // Update adjust value:
  if (points != undefined) {
    if (note.adjust != points && id != undefined) {
      // rubric is dirty only if the points actually changed
      mark_dirty(rb)
    }
    note.adjust = points;
  }

  // Update feedback according to toggle status:
  if (id == undefined) { // a specific note

    if (toggled) {
      if (note.disabled) {
        // feedback is dirty if the toggle state is changing
        mark_dirty(fb);
      }

      delete note["disabled"];

      desc.classList.remove("disabled");
      if (adjust_input != undefined) {
        adjust_input.classList.remove("disabled");
        adjust_input.disabled = false;
      }
    } else {
      if (!note.disabled) {
        // feedback is dirty if the toggle state is changing
        mark_dirty(fb);
      }

      note.disabled = true;

      desc.classList.add("disabled");
      if (adjust_input != undefined) {
        adjust_input.classList.add("disabled");
        adjust_input.disabled = true;
      }
    }
  } else { // a common note

    if (toggled) {
      if (!fb.notes.hasOwnProperty(addr)) {
        fb.notes[addr] = {};
      } // add an entry for this address if we didn't have one already
      if (!fb.notes[addr].hasOwnProperty(id) || fb.notes[addr][id] != 1) {
        mark_dirty(fb); // feedback is dirty
      }
      fb.notes[addr][id] = 1; // short truthy value

      desc.classList.remove("disabled");
      if (adjust_input != undefined) {
        adjust_input.classList.remove("disabled");
        adjust_input.disabled = false;
      }
    } else {
      if (fb.notes.hasOwnProperty(addr)) {
        mark_dirty(fb); // feedback is dirty
        delete fb.notes[addr][id];
        if (Object.keys(fb.notes[addr]).length == 0) { // last one is gone
          delete fb.notes[addr];
        }
      } // otherwise don't worry about it

      desc.classList.add("disabled");
      if (adjust_input != undefined) {
        adjust_input.classList.add("disabled");
        adjust_input.disabled = true;
      }
    }
  }

  // Propagate points changes upwards:
  propagate_points(section);
}

function toggle_rubric_state(node, enable) {
  if (node.tagName == "INPUT" && node_has_class(node, "points-worth")) {
    if (enable) {
      node.disabled = false;
      node.classList.remove("disabled");
    } else {
      node.disabled = true;
      node.classList.add("disabled");
    }
  }

  if (node.tagName == "INPUT" && node_has_class(node, "add-category")) {
    if (enable) {
      node.style.display = "inline";
    } else {
      node.style.display = "none";
    }
  }

  // TODO: Less brute-force?
  if (node.childNodes != undefined) {
    for (let child of node.childNodes) {
      toggle_rubric_state(child, enable);
    }
  }
}

function weave(submission) {
  /*
   * Weaves a submission object into a DOM element suitable for the
   * "evaluation" div.
   */
  let rubric = submission.rubric;
  let feedback = submission.feedback;

  let sub_div = document.createElement("div");
  sub_div.classList.add("feedback");

  let progress = document.createElement("div");
  progress.classList.add("progress");
  progress.classList.add("progress-" + feedback.progress);

  let clean = document.createElement("span");
  clean.id = "feedback_clean";
  clean.classList.add("data-status");
  clean.classList.add("data-clean");
  if (feedback.dirty || rubric.dirty) {
    clean.appendChild(document.createTextNode("unsaved changes"));
  } else {
    clean.appendChild(document.createTextNode("no changes"));
  }
  progress.appendChild(clean);

  let finished = document.createElement("input");
  finished.classList.add("toggle-button");
  finished.type = "checkbox";
  finished.checked = feedback.progress == "finished";
  finished.addEventListener(
    "click",
    function () {
      if (finished.checked) {
        feedback.progress = "finished";
        progress.classList.remove("progress-active");
        progress.classList.remove("progress-fresh");
        progress.classList.add("progress-finished");
      } else {
        feedback.progress = "active";
        progress.classList.remove("progress-finished");
        progress.classList.remove("progress-fresh");
        progress.classList.add("progress-active");
      }
    }
  );
  progress.appendChild(finished);
  progress.appendChild(document.createTextNode("Finished"));

  sub_div.appendChild(progress);

  sub_div.appendChild(weave_category(rubric.category, rubric, feedback));

  // Lock or unlock rubric:
  let lock_rubric = document.getElementById("lock_rubric");
  toggle_rubric_state(sub_div, !lock_rubric.checked);

  return sub_div;
}

function weave_category(category, rubric, feedback, prefix) {
  /*
   * Recursive helper for weave that handles a single rubric category at a
   * time.
   */

  // Figure out our current category address:
  let address = "";
  if (prefix != undefined) {
    address = prefix + '.' + category.title
  } else {
    address = category.title;
  }

  // Figure out whether we need to recurse or not, and do so first:
  let child_stuff = [];
  if (category.hasOwnProperty("children")) { // recurse
    for (let child of category.children) {
      child_stuff.push(weave_category(child, rubric, feedback, address));
    }
  }

  let notes_here = [];
  let cat = lookup_category(rubric, address);
  let keylist = category.note_order;
  if (keylist != undefined) {
    for (let id of keylist) {
      if (cat.notes == undefined) {
        console.error(
          "Category '" + address + "' has note_order but no notes!"
        );
      } else {
        if (cat.notes.hasOwnProperty(id)) {
          let note = cat.notes[id];
          let disabled = true;
          if (
            feedback.notes.hasOwnProperty(address)
         && feedback.notes[address].hasOwnProperty(id)
          ) {
            disabled = false;
          }
          notes_here.push(weave_note(note, address, id, disabled));
        } else {
          console.error("note_orer contains missing note ID '" + id + "'");
        }
      }
    }
  }

  let specific_here = [];
  for (let note of feedback.specific) {
    if (note.item == address) {
      specific_here.push(weave_note(note, address));
    }
  }

  // Create a section div:
  let section = document.createElement("div");
  section.classList.add("section");
  section.__address__ = address;
  section.__rubric__ = rubric;
  section.__feedback__ = feedback;

  // Points div (first because it floats):
  let points = document.createElement("div");
  points.classList.add("points");
  section.appendChild(points);

  // A category has points earned and points worth...
  // Points earned (adjustable):
  let earned = document.createElement("input");
  earned.classList.add("points-earned");
  earned.type = "text";
  earned.value = "";
  earned.addEventListener(
    "blur",
    function () { update_category_earned(section) }
  );
  points.appendChild(earned);

  points.appendChild(document.createTextNode(" / "));

  // Points worth (from rubric):
  let worth = document.createElement("input");
  worth.classList.add("points-worth");
  worth.type = "text";
  worth.value = "";
  worth.addEventListener(
    "blur",
    function () { update_category_worth(section) }
  );
  points.appendChild(worth);

  // Collapse button:
  let collapse = document.createElement("button");
  collapse.classList.add("collapse-button");
  collapse.appendChild(document.createTextNode("-"));
  collapse.addEventListener("click", collapse_section);
  section.appendChild(collapse);

  // Title span:
  let title = document.createElement("span");
  title.appendChild(document.createTextNode(category.title));
  title.classList.add("sec-title");
  section.appendChild(title);

  // Common notes:
  let common_subsection = document.createElement("div");
  common_subsection.classList.add("notes");
  common_subsection.classList.add("common");
  for (let div of notes_here) {
    common_subsection.appendChild(div);
  }

  section.appendChild(common_subsection);

  // Specific notes:
  let specific_subsection = document.createElement("div");
  specific_subsection.classList.add("notes");
  specific_subsection.classList.add("specific");
  for (let div of specific_here) {
    specific_subsection.appendChild(div);
  }

  section.appendChild(specific_subsection);

  // Add note button:
  let add_note = document.createElement("input");
  add_note.classList.add("dialog-button");
  add_note.classList.add("add-common");
  add_note.type = "button";
  add_note.value = "+ note";
  add_note.addEventListener(
    "click",
    function () {
      specific_subsection.appendChild(
        create_note_editor(section)
      );
    }
  );
  section.appendChild(add_note);
  section.appendChild(document.createElement("br"));

  // Add category button:
  let add_category = document.createElement("input");
  add_category.classList.add("dialog-button");
  add_category.classList.add("add-category");
  add_category.type = "button";
  add_category.value = "+ category";
  add_category.addEventListener(
    "click",
    function () {
      section.insertBefore(
        create_category_editor(section),
        add_category.nextSibling
      );
    }
  );
  section.appendChild(add_category);

  // Subcategories:
  let children_subsection = document.createElement("span");
  children_subsection.classList.add("children");
  for (let child of child_stuff) {
    children_subsection.appendChild(child);
  }
  section.appendChild(children_subsection);

  // Show points:
  refresh_points(section, 1);

  return section;
}

function get_parent_section(note_div) {
  return note_div.parentNode.parentNode;
}

function weave_note(note, address, id, disabled) {
  /*
   * Takes a note object (either a specific note or a note item looked up from
   * a rubric) and creates an HTML DOM element for that note, rigging the
   * various inputs to modify the note in question.
   */
  if (disabled == undefined) {
    disabled = note.disabled; // it's fine if this is also undefined
  }

  // Create a note div:
  let note_div = document.createElement("div");
  note_div.classList.add("note");
  note_div.__note__ = note;
  note_div.__id__ = id; // okay if this is undefined

  // Points paragraph (first because it floats):
  let points = document.createElement("div");
  points.classList.add("points");
  note_div.appendChild(points);

  // What goes in the points div:
  if (note.hasOwnProperty("adjust")) {
    // An adjustment with a point value...
    // Points adjust:
    adjust = document.createElement("input");
    adjust.classList.add("points-adjust");
    adjust.type = "text";
    adjust.value = "" + note.adjust;
    if (disabled) {
      adjust.classList.add("disabled");
      adjust.disabled = true;
    }
    adjust.addEventListener(
      "blur",
      function () { update_note(note_div) }
    );
    points.appendChild(adjust);
  } else { // otherwise, we don't display points directly in the note
    points.style.display = "none";
  }

  // Create a toggle box for this note:
  let toggle = document.createElement("input");
  toggle.classList.add("toggle-button");
  toggle.type = "checkbox";
  toggle.addEventListener(
    "click",
    function () { update_note(note_div) }
  );
  note_div.appendChild(toggle);

  // Description span:
  let desc = document.createElement("span");
  // TODO: Process line number refs here?
  desc.appendChild(document.createTextNode(note.description));
  desc.classList.add("note-description");
  note_div.appendChild(desc);

  // Set toggle and description class based on disabled status:
  if (disabled) {
    toggle.checked = false;
    desc.classList.add("disabled");
  } else {
    toggle.checked = true;
  }

  return note_div;
}

function create_confirm_buttons(element, on_confirm) {
  /*
   * Creates confirm/cancel buttons for the given element, with the given
   * callback to occur (receiving the element as an argument) if the user
   * confirms. Both buttons remove the element from its parent.
   */

  // Buttons
  let buttons = document.createElement("div");
  buttons.classList.add("dialog-buttons");

  // Confirm button
  let confirm = document.createElement("input");
  confirm.classList.add("dialog-button");
  confirm.type = "button";
  confirm.value = "confirm";
  confirm.addEventListener(
    "click",
    function () {
      // Call the callback
      on_confirm(element);

      // Show ourselves out
      element.parentNode.removeChild(element);
    }
  );
  buttons.appendChild(confirm);

  // Cancel button
  let cancel = document.createElement("input");
  cancel.classList.add("dialog-button");
  cancel.type = "button";
  cancel.value = "cancel";
  cancel.addEventListener(
    "click",
    function () {
      // Show ourselves out
      element.parentNode.removeChild(element);
    }
  );

  buttons.appendChild(cancel);

  return buttons;
}

function create_done_button(element, on_done) {
  /*
   * Creates done button for the given element, with the given callback (if
   * any)to occur (receiving the element as an argument) when the user clicks
   * it. The button removes the element from its parent after the callback.
   */

  // Buttons
  let buttons = document.createElement("div");
  buttons.classList.add("dialog-buttons");

  // Done button
  let done = document.createElement("input");
  done.classList.add("dialog-button");
  done.type = "button";
  done.value = "done";
  done.addEventListener(
    "click",
    function () {
      // Call the callback
      if (on_done != undefined) {
        on_done(element);
      }

      // Show ourselves out
      element.parentNode.removeChild(element);
    }
  );
  buttons.appendChild(done);

  return buttons;
}

function create_note_editor(section) {
  let editor = document.createElement("div");
  editor.classList.add("editor");
  editor.classList.add("note-editor");

  // Category select
  let cat_select = document.createElement("select");
  for (let cat_name of CATEGORIES) {
    let opt = document.createElement("option");
    opt.classList.add("cat-" + cat_name);
    opt.value = cat_name;
    opt.innerHTML = cat_name;
    if (cat_name == "adjust") { opt.selected = "true"; }
    cat_select.appendChild(opt);
  }
  editor.appendChild(document.createTextNode("Category: "));
  editor.appendChild(cat_select);
  editor.appendChild(document.createElement("br"));

  // Severity select
  let sev_select = document.createElement("select");
  for (let sev_name of SEVERITIES) {
    let opt = document.createElement("option");
    opt.classList.add("sev-" + sev_name);
    opt.value = sev_name;
    opt.innerHTML = sev_name;
    if (sev_name == "adjustment") { opt.selected = "true"; }
    sev_select.appendChild(opt);
  }
  editor.appendChild(document.createTextNode("Severity: "));
  editor.appendChild(sev_select);
  editor.appendChild(document.createElement("br"));

  // Description box
  let desc = document.createElement("input");
  desc.classList.add("note-description");
  desc.type = "text";
  desc.value = "?";
  editor.appendChild(document.createTextNode("Description: "));
  editor.appendChild(desc);
  editor.appendChild(document.createElement("br"));

  // Points box
  let points_div = document.createElement("div");
  let points = document.createElement("input");
  points.classList.add("points-adjust");
  points.type = "text";
  points.value = "0";
  points_div.appendChild(document.createTextNode("Points: "));
  points_div.appendChild(points);
  editor.appendChild(points_div);

  // Points box hides if it's irrelevant
  function points_are_relevant() {
    return cat_select.value != "info" && sev_select.value != "note";
  }

  function hide_points_if_irrelevant() {
    if (!points_are_relevant()) {
      points_div.style.display = "none";
    } else {
      points_div.style.display = "block";
    }
  }

  cat_select.addEventListener("change", hide_points_if_irrelevant);
  sev_select.addEventListener("change", hide_points_if_irrelevant);

  // Specificity checkbox
  let spec_box = document.createElement("input");
  spec_box.classList.add("toggle-button");
  spec_box.classList.add("specific-option");
  spec_box.type = "checkbox";
  spec_box.checked = document.getElementById("common_default").checked;
  editor.appendChild(spec_box);
  editor.appendChild(document.createTextNode("Add to rubric"));
  editor.appendChild(document.createElement("br"));

  // Confirm/cancel buttons
  editor.appendChild(
    create_confirm_buttons(
      editor,
      function () {
        // Create base note object
        let new_note = {
          "category": cat_select.value,
          "severity": sev_select.value,
          "description": desc.value
        };

        // Set points
        if (points_are_relevant()) {
          let pv = parseFloat(points.value);
          if (isNaN(pv)) {
            pv = 0;
          }
          new_note.adjust = pv;
        } // else no "adjust" key

        // Figure out where this note is going:
        let specific = !spec_box.checked;
        let addr = section.__address__;
        let feedback = section.__feedback__;
        let rubric = section.__rubric__;

        // Create the new note in the rubric or feedback:
        if (specific) { // add it to specific notes in feedback

          new_note.item = addr;
          feedback.specific.push(new_note);

          // Add a div to our section:
          let specific = get_specific_subsection(section);
          specific.appendChild(weave_note(new_note, addr, undefined, false));

          // Mark the feedback as dirty:
          mark_dirty(feedback);

        } else {

          let category = lookup_category(rubric, addr);
          let id = next_note_id(category);
          if (category.note_order == undefined) {
            category.note_order = [];
          }
          category.note_order.push(id);
          if (category.notes == undefined) {
            category.notes = {};
          }
          category.notes[id] = new_note;
          // Enable the new note:
          if (!feedback.notes.hasOwnProperty(addr)) {
            feedback.notes[addr] = {};
          }
          feedback.notes[addr][id] = 1;

          let common = get_common_subsection(section);
          common.appendChild(weave_note(new_note, addr, id, false));

          // Mark the feedback and rubric as dirty:
          mark_dirty(feedback);
          mark_dirty(rubric);
        }

        // Update point totals:
        propagate_points(section);
      }
    )
  );

  return editor;
}

function create_category_editor(section) {
  let editor = document.createElement("div");
  editor.classList.add("editor");
  editor.classList.add("category-editor");

  // Title box
  let title = document.createElement("input");
  title.classList.add("sec-title");
  title.type = "text";
  title.value = "?";
  editor.appendChild(document.createTextNode("Title: "));
  editor.appendChild(title);
  editor.appendChild(document.createElement("br"));

  // Auto checkbox
  let autobox = document.createElement("input");
  autobox.classList.add("toggle-button");
  autobox.classList.add("auto-worth-option");
  autobox.type = "checkbox";
  autobox.checked = false;
  editor.appendChild(autobox);
  editor.appendChild(document.createTextNode("Determine value from children"));
  editor.appendChild(document.createElement("br"));

  // Parent auto checkbox
  let parent_autobox = document.createElement("input");
  parent_autobox.classList.add("toggle-button");
  parent_autobox.classList.add("parent-auto-worth-option");
  parent_autobox.type = "checkbox";
  parent_autobox.checked = true;
  editor.appendChild(parent_autobox);
  editor.appendChild(
    document.createTextNode("Determine parent value from children")
  );
  editor.appendChild(document.createElement("br"));

  // Points box
  let points_div = document.createElement("div");
  let points = document.createElement("input");
  points.classList.add("points-adjust");
  points.type = "text";
  points.value = "1";
  points_div.appendChild(document.createTextNode("Worth: "));
  points_div.appendChild(points);
  editor.appendChild(points_div);

  // Points box hides if it's irrelevant
  function points_are_relevant() {
    return !autobox.checked;
  }

  function hide_points_if_irrelevant() {
    if (!points_are_relevant()) {
      points_div.style.display = "none";
    } else {
      points_div.style.display = "block";
    }
  }

  autobox.addEventListener("change", hide_points_if_irrelevant);

  editor.appendChild(
    create_confirm_buttons(
      editor,
      function () {
        // Create base note object
        let new_category = { "title": title.value };

        // Set worth
        if (points_are_relevant()) {
          let pv = parseFloat(points.value);
          if (isNaN(pv)) {
            pv = "";
          }
          new_category.worth = pv;
        } else {
          new_category.worth = ""; // auto from children
        }

        // Figure out where this category is going:
        let addr = section.__address__;
        let feedback = section.__feedback__;
        let rubric = section.__rubric__;

        // Create the new category in the rubric:
        let category = lookup_category(rubric, addr);
        if (parent_autobox.checked) {
          category.worth = "";
        }
        if (!category.hasOwnProperty("children")) {
          category.children = [];
        }
        category.children.push(new_category);

        // Add the new category to the DOM:
        let children_span = get_children_subsection(section);
        children_span.appendChild(
          weave_category(new_category, rubric, feedback, addr)
        );

        // Mark the rubric as dirty:
        mark_dirty(rubric);

        // Update point totals:
        propagate_points(section);
      }
    )
  );

  return editor;
}

function create_save_dialog() {
  /*
   * Looks at all currently cached data (ignores in-flight data, as that stuff
   * hasn't changed) and creates a list of dirty items to save, which it
   * displays with confirm/cancel buttons to actually push the data to the
   * server.
   */

  // First, gather dirty rubric and feedback objects:
  let dirty_rubrics = [];
  let dirty_feedback = [];

  for (let asg of Object.keys(RUBRICS)) {
    for (let task of Object.keys(RUBRICS[asg])) {
      let rb = RUBRICS[asg][task];
      if (rb.dirty) {
        dirty_rubrics.push(rb);
      }
    }
  }

  for (let asg of Object.keys(FEEDBACK)) {
    for (let task of Object.keys(FEEDBACK[asg])) {
      for (let student of Object.keys(FEEDBACK[asg][task])) {
        let fb = FEEDBACK[asg][task][student];
        if (fb.dirty) {
          dirty_feedback.push(fb);
        }
      }
    }
  }

  // Now create our dialog:
  let dialog = document.createElement("div");
  dialog.classList.add("dialog");

  if (dirty_rubrics.length + dirty_feedback.length == 0) {
    // Nothing to save
    dialog.appendChild(
      document.createTextNode("There are no unsaved changes.")
    );
    dialog.appendChild(create_done_button(dialog));
    return dialog;
  }

  // At least one item to save...

  dialog.appendChild(
    document.createTextNode("The following items have been modified:")
  );

  let modlist = document.createElement("ul");
  modlist.classList.add("save-list");

  if (dirty_rubrics.length > 0) {
    let rub = document.createElement("li");
    rub.appendChild(document.createTextNode("Rubrics:"))

    let modrub = document.createElement("ul");
    for (let rb of dirty_rubrics) {
      let li = document.createElement("li");
      li.classList.add("save-rubric");
      li.appendChild(document.createTextNode(rb.asg + "/" + rb.task));
      modrub.appendChild(li);
    }

    rub.appendChild(modrub);

    modlist.appendChild(rub);
  }

  if (dirty_feedback.length > 0) {
    let feed = document.createElement("li");
    feed.appendChild(document.createTextNode("Feedback:"))

    let modfeed = document.createElement("ul");
    for (let fb of dirty_feedback) {
      let li = document.createElement("li");
      li.classList.add("save-feedback");
      li.appendChild(
        document.createTextNode(fb.asg + "/" + fb.task + ":" + fb.student)
      );
      modfeed.appendChild(li);
    }

    feed.appendChild(modfeed);

    modlist.appendChild(feed);
  }

  dialog.appendChild(modlist);

  dialog.appendChild(
    document.createTextNode("Are you sure you want to save these changes?")
  );

  dialog.appendChild(
    create_confirm_buttons(
      dialog,
      function () {
        // We've started a save operation
        SAVE_IN_FLIGHT = {
          "rubrics": {},
          "feedback": {}
        };

        // Disable the save button
        document.getElementById("save_changes").disabled = true;

        // Clean up dirty flags and start individual operations
        ANY_DIRTY = false;
        for (let rb of dirty_rubrics) {
          delete rb["dirty"];
          upload_rubric(rb);
        }
        for (let fb of dirty_feedback) {
          delete fb["dirty"];
          upload_feedback(fb);
        }
      }
    )
  );

  return dialog;
}

function upload_rubric(rb) {
  if (!SAVE_IN_FLIGHT.rubrics.hasOwnProperty(rb.asg)) {
    SAVE_IN_FLIGHT.rubrics[rb.asg] = {};
  }
  SAVE_IN_FLIGHT.rubrics[rb.asg][rb.task] = rb;
  upload_json(
    "rubric/" + rb.asg + "/" + rb.task,
    rb,
    function () {
      finalize_rubric_save(rb.asg, rb.task);
    },
    function (category, error) {
      console.warn("Unable to save rubric '" + rb.asg + "/" + rb.task + "'");
      mark_dirty(rb);
      finalize_rubric_save(rb.asg, rb.task);
    }
  );
}

function upload_feedback(fb) {
  if (!SAVE_IN_FLIGHT.feedback.hasOwnProperty(fb.asg)) {
    SAVE_IN_FLIGHT.feedback[fb.asg] = {};
  }
  if (!SAVE_IN_FLIGHT.feedback[fb.asg].hasOwnProperty(fb.task)) {
    SAVE_IN_FLIGHT.feedback[fb.asg][fb.task] = {};
  }
  SAVE_IN_FLIGHT.feedback[fb.asg][fb.task][fb.student] = fb;
  let fbpath = "feedback/" + fb.asg + "/" + fb.task + "/" + fb.student
  upload_json(
    fbpath,
    fb,
    function () {
      finalize_feedback_save(fb.asg, fb.task, fb.student);
    },
    function (category, error) {
      console.warn(
        "Unable to save feedback '" + fb.asg + "/" + fb.task + ":"
      + fb.student + "'"
      );
      mark_dirty(fb);
      finalize_feedback_save(fb.asg, fb.task, fb.student);
    }
  );
}

function save_in_progress() {
  if (SAVE_IN_FLIGHT == undefined) {
    return false;
  }
  for (let asg of Object.keys(SAVE_IN_FLIGHT.rubrics)) {
    if (Object.keys(SAVE_IN_FLIGHT.rubrics[asg]).length > 0) {
      return true;
    }
  }
  for (let asg of Object.keys(SAVE_IN_FLIGHT.feedback)) {
    for (let task of Object.keys(SAVE_IN_FLIGHT.feedback[asg])) {
      if (Object.keys(SAVE_IN_FLIGHT.feedback[asg][task]).length > 0) {
        return true;
      }
    }
  }
  return false;
}

function finalize_rubric_save(asg, task) {
  delete SAVE_IN_FLIGHT.rubrics[asg][task];
  if (!save_in_progress()) { // that was the last thing being saved
    clean_up_save();
  }
}

function finalize_feedback_save(asg, task, student) {
  delete SAVE_IN_FLIGHT.feedback[asg][task][student];
  if (!save_in_progress()) { // that was the last thing being saved
    clean_up_save();
  }
}

function clean_up_save() {
  SAVE_IN_FLIGHT = undefined;
  if (ANY_DIRTY) {
    document.getElementById("save_changes").disabled = false;
  } else {
    let fb_clean = document.getElementById("feedback_clean")
    fb_clean.innerText = "no changes";
    fb_clean.classList.add("data-clean");
    fb_clean.classList.remove("data-dirty");
  }
}

function create_dump_dialog() {
  /*
   * Looks at all currently cached data (ignores in-flight data, as that stuff
   * hasn't changed) and creates a big JSON object storing everything to dump
   * to a text box.
   */

  // First, bundle things up into a big JSON string:
  let now = new Date();
  let obj = {
    "created": now.toJSON(),
    "rubrics": {},
    "feedback": {}
  }

  for (let asg of Object.keys(RUBRICS)) {
    obj.rubrics[asg] = {};
    for (let task of Object.keys(RUBRICS[asg])) {
      obj.rubrics[asg][task] = RUBRICS[asg][task];
    }
  }

  for (let asg of Object.keys(FEEDBACK)) {
    obj.feedback[asg] = {};
    for (let task of Object.keys(FEEDBACK[asg])) {
      obj.feedback[asg][task] = {};
      for (let student of Object.keys(FEEDBACK[asg][task])) {
        obj.feedback[asg][task][student] = FEEDBACK[asg][task][student];
      }
    }
  }

  let json = JSON.stringify(obj);

  // Now create our dialog:
  let dialog = document.createElement("div");
  dialog.classList.add("dialog");

  dialog.appendChild(
    document.createTextNode(
      "Use the download button to receive the dump as a file, OR copy-paste the data from the text box below. Use the 'Restore from JSON' button to load the data and restore any changes you have made."
    )
  );
  dialog.appendChild(document.createElement("br"));
  dialog.appendChild(document.createElement("br"));
  dialog.appendChild(
    document.createTextNode(
      "NOTE: The system cannot detect updates made (by you or others) since the dump, and they will be overwritten! Use only in an emergency when 'Save Changes' does not work."
    ) // TODO: Detect those changes!
  );

  let dl_div = document.createElement("div");
  dl_div.classList.add("dialog-buttons");

  let dl_link = document.createElement("a");

  let blob = new Blob([json], {type: "text/json;charset=utf-8"});
  let ourl = URL.createObjectURL(blob);
  let ts = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
  dl_link.href = ourl;
  dl_link.download = "rigging-dump-" + ts + ".json";

  let dl_button = document.createElement("input");
  dl_button.type = "button"
  dl_button.value = "Download JSON"

  dl_link.appendChild(dl_button);
  dl_div.appendChild(dl_link);

  dialog.appendChild(dl_div);

  let copyarea = document.createElement("textarea");
  copyarea.rows = "8";
  copyarea.readOnly = true;
  copyarea.value = json;
  copyarea.addEventListener("click", function () { copyarea.select(); });

  dialog.appendChild(copyarea);

  dialog.appendChild(create_done_button(dialog));

  return dialog;
}

function create_restore_dialog() {
  /*
   * Creates a dialog that allows uploading a dump file to replace
   * currently-loaded data. Uploading a dump will steal callbacks from the
   * rubric and feedback queues, effectively cancelling any in-flight loading
   * operations.
   */

  // Create our dialog:
  let dialog = document.createElement("div");
  dialog.classList.add("dialog");

  dialog.appendChild(
    document.createTextNode(
      "Use the upload button to upload a dump file created using the 'Dump JSON' button."
    )
  );
  dialog.appendChild(document.createElement("br"));
  dialog.appendChild(document.createElement("br"));
  dialog.appendChild(
    document.createTextNode(
      "NOTE: The system cannot detect updates made (by you or others) since the dump, and they will be overwritten! Use only in an emergency."
    ) // TODO: Detect those changes!
  );

  let ul_div = document.createElement("div");
  ul_div.classList.add("dialog-buttons");

  let ul_input = document.createElement("input");
  ul_input.type = "file"
  ul_input.value = ""

  let do_button = document.createElement("input");
  do_button.classList.add("dialog-button");
  do_button.type = "button";
  do_button.value = "restore";
  do_button.disabled = true;

  let loading_img = document.createElement("img");
  loading_img.src = "loading.gif";
  loading_img.alt = "loading";

  let done_msg = document.createElement("div");
  done_msg.appendChild(document.createTextNode("Restore complete."));

  function eventually_process_upload() {
    /*
     * Recursively setTimeouts until a file is available from the upload input,
     * and then loads that file, restoring rubrics and feedback. Reports any
     * errors via alerts, and asks for a refresh if they're serious.
     */
    let files = ul_input.files;
    if (files === null || files === undefined || files.length < 1) {
      setTimeout(eventually_process_upload, 50);
    } else if (files.length > 1) {
      alert(
        "You attempted to upload multiple files!\nPlease select only a single file and try again."
      );
      ul_div.removeChild(loading_img);
      do_button.disabled = false;
    } else {
      let first = files[0];
      let fr = new FileReader();
      fr.addEventListener(
        "load",
        function (e) {
          let file_text = e.target.result;
          let obj;
          try {
            obj = JSON.parse(file_text);
          } catch (e) {
            console.warn(e);
            alert("Error parsing JSON or uploading file.\nPlease try again.");
            ul_div.removeChild(loading_img);
            do_button.disabled = false;
            return;
          }
          if (
            !obj.hasOwnProperty("rubrics")
         || !obj.hasOwnProperty("feedback")
          ) {
            alert(
              "Dump JSON appears to be malformed (missing 'rubrics' or "
            + "'feedback' key).\nTry a different dump file."
            );
            ul_div.removeChild(loading_img);
            do_button.disabled = false;
            return;
          }
          try {
            // Load RUBRICS
            for (let asg of Object.keys(obj.rubrics)) {
              if (!RUBRICS.hasOwnProperty(asg)) {
                RUBRICS[asg] = {};
              }
              for (let task of Object.keys(obj.rubrics[asg])) {
                let stolen = [];
                if (
                  QUEUES.rubrics.hasOwnProperty(asg)
               && QUEUES.rubrics[asg].hasOwnProperty(task)
                ) {
                  stolen = QUEUES.rubrics[asg][task];
                  delete QUEUES.rubrics[asg][task];
                }
                RUBRICS[asg][task] = obj.rubrics[asg][task];
                for (cb of stolen) {
                  cb(RUBRICS[asg][task]);
                }
              }
            }

            // Load FEEDBACK
            for (let asg of Object.keys(obj.feedback)) {
              if (!FEEDBACK.hasOwnProperty(asg)) {
                FEEDBACK[asg] = {};
              }
              for (let task of Object.keys(obj.feedback[asg])) {
                if (!FEEDBACK[asg].hasOwnProperty(task)) {
                  FEEDBACK[asg][task] = {};
                }
                for (let student of Object.keys(obj.feedback[asg][task])) {
                  let stolen = [];
                  if (
                    QUEUES.feedback.hasOwnProperty(asg)
                 && QUEUES.feedback[asg].hasOwnProperty(task)
                 && QUEUES.feedback[asg][task].hasOwnProperty(student)
                  ) {
                    stolen = QUEUES.feedback[asg][task][student];
                    delete QUEUES.feedback[asg][task];
                  }
                  FEEDBACK[asg][task][student]=obj.feedback[asg][task][student];
                  for (cb of stolen) {
                    cb(FEEDBACK[asg][task][student]);
                  }
                }
              }
            }

            // Re-link submissions
            for (let asg of Object.keys(SUBMISSIONS)) {
              for (let task of Object.keys(SUBMISSIONS[asg])) {
                for (let student of Object.keys(SUBMISSIONS[asg][task])) {
                  let sub = SUBMISSIONS[asg][task][student];
                  sub.rubric = RUBRICS[asg][task];
                  sub.feedback = FEEDBACK[asg][task][student];
                }
              }
            }

            // Clean out the points cache.
            clear_points_cache();

            // Re-evaluate submission display with the new info.
            refresh_display();

            ul_div.removeChild(loading_img);
            ul_div.appendChild(done_msg);
            do_button.disabled = false;
          } catch (e) {
            console.warn(e);
            alert(
              "Error unpacking dump file. Data integrity compromised!\n"
            + "Please reload the page."
            );
            ul_div.removeChild(loading_img);
            ul_div.appendChild(document.createTextNode("ERROR"));
            ul_div.appendChild(document.createElement("br"));
            ul_div.appendChild(
              document.createTextNode("Please refresh the page.")
            );
            // leave button disabled
          }
        }
      );
      fr.readAsText(first);
    }
  }

  ul_input.addEventListener(
    "change",
    function () {
      do_button.disabled = false;
      try {
        ul_div.removeChild(done_msg);
      } catch (e) {}
    }
  );

  do_button.addEventListener(
    "click",
    function () {
      ul_div.appendChild(loading_img);
      do_button.disabled = true;
      try {
        ul_div.removeChild(done_msg);
      } catch (e) {}
      eventually_process_upload();
    }
  );

  ul_div.appendChild(ul_input);
  ul_div.appendChild(do_button);

  dialog.appendChild(ul_div);

  dialog.appendChild(create_done_button(dialog));

  return dialog;
}
