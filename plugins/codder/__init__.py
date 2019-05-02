"""
Codder plugin for Rigging grading system.
Runs Codder to produce automatic feedback entries and adds them in a "Codder"
category as specific feedback for each student. Also provides a "Run Codder"
button that will re-run Codder for the current student. Codder runs
automatically the first time a student's feedback is loaded, and the feedback
appears asynchronously once Codder is done, or an error message is added to the
feedback if Codder takes too long to run.
"""

# Plugin configuration variables
NAME="Codder" # name of this plugin
JS=["codder.js"] # Extra JavaScript file(s) to load (relative to plugin folder)
CSS=[] # Extra CSS files to load (relative to plugin folder)

def plug_in(app, globals):
  """
  Given a flask app object and the globals dictionary from rigging.py, this
  function handles any extra work necessary to integrate this plugin with the
  Rigging webapp, outside of the following tasks, which are handled
  automatically:

    1. The contents of each of the files in the JS list (specified relative to
       the plugin directory) will be automatically loaded as part of the
       rigging.html template.
    2. The contents of each file in the CSS list (also specified relative to
       the plugin directory) will also be loaded as part of the rigging.html
       template.

  For this plugin ('Codder'), we create some new routes for receiving
  auto-grade requests for particular files and sending the results back to the
  requester. Note that each Codder request can take 10+ *seconds* to run.
  """
  # New route for requesting Codder evaluation of a file
  @app.route(
    "/plugins/codder/<string:pset>/<string:task>/<string:student>",
    methods=["GET", "POST"]
  )
  def request_codder_eval(pset, task, student):
    pass
    # TODO: HERE!
