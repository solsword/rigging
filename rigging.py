import flask
import os

app = flask.Flask(__name__)

app.secret_key = b"a\xed\x01\xf9\xc6\x80\xe1FVE\x13\xc8\xb6\x9f6\x82"

def valid_login(username, password):
  return (
    username == "cs111-staff"
and password == ""
  )

@app.route("/")
def index():
  return flask.redirect(flask.url_for("rigging"))

@app.route("/rigging.html")
def rigging():
  if flask.session.get("username", None) == None:
    flask.flash("Please log in first.")
    return flask.redirect(flask.url_for("login"))
  else:
    return flask.render_template("rigging.html")

@app.route("/login", methods=["GET", "POST"])
def login():
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
      return flask.redirect(flask.url_for("rigging"))
    else:
      flask.flash("Invalid username or password.")
      return flask.redirect(flask.url_for("login"))
  else:
    return flask.render_template("login.html")

#@app.route("/

@app.route("/logout")
def logout():
  flask.session.pop("username", None)
  flask.flash("You have been logged out. Please log in again to continue.")
  return flask.redirect(flask.url_for("login"))
