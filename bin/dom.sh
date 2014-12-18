#!/bin/bash

java -jar closure-compiler.jar --js=../frontend/express/public/javascripts/dom/jquery/jquery-1.8.3.min.js --js=../frontend/express/public/javascripts/dom/jquery.form.js --js=../frontend/express/public/javascripts/dom/tipsy/jquery.tipsy.js --js=../frontend/express/public/javascripts/dom/jquery.noisy.min.js --js=../frontend/express/public/javascripts/dom/jquery.sticky.headers.js --js=../frontend/express/public/javascripts/dom/jqueryui/jquery-ui-1.8.22.custom.min.js --js=../frontend/express/public/javascripts/dom/jqueryui/jquery-ui-i18n.js --js=../frontend/express/public/javascripts/dom/slimScroll.min.js --js=../frontend/express/public/javascripts/dom/jquery.easing.1.3.js --js=../frontend/express/public/javascripts/dom/dataTables/js/jquery.dataTables.js --js=../frontend/express/public/javascripts/dom/dataTables/js/ZeroClipboard.js --js=../frontend/express/public/javascripts/dom/dataTables/js/TableTools.js --js_output_file=./min/countly.dom.js