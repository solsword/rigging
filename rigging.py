import flask
import os
import posixpath
import json
import sys
import collections

# First, load plugins via plugins/__main__.py
from . import plugins

PLUGINS = collections.OrderedDict()
for plugin in plugins.ALL:
  name = getattr(plugin, "NAME", plugin.__name__)
  css_files = getattr(plugin, "CSS", [])
  js_files = getattr(plugin, "JS", [])
  base = os.path.dirname(plugin.__file__)

  # Read CSS files since we won't serve them directly from plugins directory:
  css = []
  for f in css_files:
    with open(os.path.join(base, *posixpath.split(f)), 'r') as fin:
      css.append(fin.read())

  # Read JS files since we won't serve them directly from plugins directory:
  js = []
  for f in js_files:
    with open(os.path.join(base, *posixpath.split(f)), 'r') as fin:
      js.append(fin.read())

  connect = getattr(plugin, "plug_in", None)

  PLUGINS[name] = {
    'path': base,
    'css': css,
    'js': js,
    'connect': connect,
  }
  # Note: final activation happens after standard routes are defined

app = flask.Flask(__name__)

app.secret_key = b"a\xed\x01\xf9\xc6\x80\xe1FVE\x13\xc8\xb6\x9f6\x82"

def valid_login(username, password):
  return (
    username == "cs111-staff"
and password == ""
  )

@app.route("/")
def index():
  return flask.redirect(flask.url_for("evaluate"))

@app.route("/evaluate")
def evaluate():
  """
  Serves the main app for entering grades.
  """
  if flask.session.get("username", None) == None:
    flask.flash("Please log in first.")
    return flask.redirect(flask.url_for("login"))
  else:
    return flask.render_template("rigging.html", plugins=PLUGINS)

FN_BAD = '\\/:*?"<>|~'

def forbidden_path(path):
  """
  Returns True if the given path contains forbidden characters. Checks for
  '\\', '/', '~' and '..' (although '.' is allowed) to attempt to prevent
  access to files outside the intended directory tree, and also checks for ':',
  '*', '?', '"', '<', '>', and '|' to humor (perhaps outdated?) OS filename
  restrictions.
  TODO: Is there a builtin for this?
  """
  return any(c in path for c in FN_BAD) or '..' in path

def carefully_overwrite(target, obj):
  """
  Writes the given object to the given file as JSON. Records old file contents
  and attempts to restore them if something goes wrong during the file writing
  process. Returns True if it succeeds, and False if it fails.
  TODO: Maintain backup files?
  """
  if os.path.exists(target):
    try:
      with open(target, 'r') as fin:
        backup = fin.read()
    except:
      print(
        "Error: Unable to read file '{}' for backup.".format(target),
        file=sys.stderr
      )
      return False

  # Try to encode the object as JSON:
  try:
    content = json.dumps(obj)
  except:
    print(
      "Error: Unable to convert object to json:{}'".format(repr(obj)),
      file=sys.stderr
    )
    return False

  # Try to overwrite the file:
  try:
    with open(target, 'w', encoding="utf-8") as fout:
      fout.write(content)
  except:
    # Try to write backup (if initial write fails due to e.g. permissions,
    # we'll just have to hope that that means the file is not erased).
    try:
      print(
        "Error: Unable to write file '{}'".format(target),
        file=sys.stderr
      )
      with open(target, 'w', encoding="utf-8") as fout:
        fout.write(backup)
      return False
    except:
      print(
        "Error: Unable to restore backup for file '{}'".format(target),
        file=sys.stderr
      )
      return False

  return True

@app.route("/upload/rubric/<asg>/<task>", methods=["POST"])
def upload_rubric(asg, task):
  """
  Accepts rubric JSON via post (TODO: only accept w/ proper MIME type) and
  stores it to the assignment/task specified by the route info.
  """
  if flask.session.get("username", None) == None:
    return "You must be logged in to edit rubrics!", 401
  elif forbidden_path(asg) or forbidden_path(task):
    return "Invalid assignment or task ID.", 403
  else:
    # Make sure request parses as JSON (Python weirdness with e.g., NaN is
    # awkward though):
    try:
      obj = flask.request.get_json(force=True)
    except:
      print("Error: bad upload request (can't access JSON):", file=sys.stderr)
      print("  Request:", flask.request, file=sys.stderr)
      print("     Data:", flask.request.data, file=sys.stderr)
      return "Invalid request", 400

    # Create directories as necessary:
    try:
      sofar = os.path.join("static", "content")
      for dir in ["assignments", asg, task]:
        sofar = os.path.join(sofar, dir)
        if not os.path.exists(sofar):
          os.mkdir(sofar)
    except:
      print(
        "Error: Unable to create directory '{}'".format(sofar),
        file=sys.stderr
      )
      return "Upload aborted", 500

    # Figure out where we're going to save things:
    rbpath = os.path.join(sofar, "rubric.json")

    # Carefully overwrite and write backup if this fails:
    if carefully_overwrite(rbpath, obj):
      return "Upload succeeded"
    else:
      return "Upload aborted", 500

@app.route("/upload/feedback/<asg>/<task>/<student>", methods=["POST"])
def upload_feedback(asg, task, student):
  """
  Accepts feedback JSON via post (TODO: only accept w/ proper MIME type) and
  stores it to the assignment/task specified by the route info.
  """
  if flask.session.get("username", None) == None:
    return "You must be logged in to edit rubrics!", 401
  elif forbidden_path(asg) or forbidden_path(task) or forbidden_path(student):
    return "Invalid assignment, task, or student ID.", 403
  else:
    # Make sure request parses as JSON (Python weirdness with e.g., NaN is
    # awkward though):
    try:
      obj = flask.request.get_json(force=True)
    except:
      print("Error: bad upload request (can't access JSON):", file=sys.stderr)
      print("  Request:", flask.request, file=sys.stderr)
      print("     Data:", flask.request.data, file=sys.stderr)
      return "Invalid request", 400

    # Create directories as necessary:
    try:
      sofar = os.path.join("static", "content")
      for dir in ["feedback", asg, student]:
        sofar = os.path.join(sofar, dir)
        if not os.path.exists(sofar):
          os.mkdir(sofar)
    except:
      print(
        "Error: Unable to create directory '{}'".format(sofar),
        file=sys.stderr
      )
      return "Upload aborted", 500

    # Figure out where we're going to save things:
    fbpath = os.path.join(sofar, task + ".json")

    # Carefully overwrite and write backup if this fails:
    if carefully_overwrite(fbpath, obj):
      return "Upload succeeded"
    else:
      return "Upload aborted", 500


@app.route("/login", methods=["GET", "POST"])
def login():
  """
  Handles login attempts via POST, and serves a login page via GET. Redirects
  to evaluate on successful login.
  """
  if flask.request.method == "POST":
    print(flask.request)
    print(flask.request.form)
    if (
      "username" not in flask.request.form
   or "password" not in flask.request.form
    ):
      flask.flash("Invalid login attempt (missing info).")
      return flask.redirect(flask.url_for("login"))
    elif valid_login(
      flask.request.form["username"],
      flask.request.form["password"]
    ):
      flask.session["username"] = flask.escape(flask.request.form["username"])
      flask.flash(
        "You are now logged in as {}".format(flask.session["username"])
      )
      return flask.redirect(flask.url_for("evaluate"))
    else:
      flask.flash("Invalid username or password.")
      return flask.redirect(flask.url_for("login"))
  else:
    return flask.render_template("login.html")

@app.route("/logout")
def logout():
  """
  Handles logout action; redirecting to login with a flash.
  """
  flask.session.pop("username", None)
  flask.flash("You have been logged out. Please log in again to continue.")
  return flask.redirect(flask.url_for("login"))

# Finally, finalize plugin activation:
for name in PLUGINS:
  if PLUGINS[name]['connect']:
    PLUGINS[name]['connect'](app, globals())
