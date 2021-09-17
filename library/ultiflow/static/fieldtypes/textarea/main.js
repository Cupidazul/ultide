define([], function() {
    return function(paramKey, $divs, config, cbReady, cbChange) {
        var self = this;

        if (typeof config.attr == 'undefined') {
            config.attr = {};
        }

        if (typeof config.css == 'undefined') {
            config.css = {};
        }

        var $input = $('<textarea class="form-control"></textarea>');
        $input.data('default', config.default);
        $input.attr(config.attr);
        $input.css(config.css);

        $input.on('change', function() {
            cbChange();
        });

        var $btnCodeEditor = $('<button class="btn btn-primary btn-sm"><i class="fa fa-eye"></i> Code Editor</button>');

        $btnCodeEditor.on('click', function(_evt) {
            var _self = this;
            let operatorId = $app.ultiflow.uf_propbar.operatorId;
            let opType = $app.ultiflow.processData.process.operators[operatorId].type;
            let codeType = 'Handlebars';
            //console.log("btnCodeEditor.on.click:", { evt: _evt, this: _self, operatorId: operatorId, opType: opType });

            if (new RegExp('^perl_', 'i').test(opType)) codeType = "Perl";
            if (new RegExp('^python_', 'i').test(opType)) codeType = "Python";
            if (new RegExp('^expect_', 'i').test(opType)) codeType = "Tcl";
            if (new RegExp('^tcl_', 'i').test(opType)) codeType = "Tcl";
            if (new RegExp('^node_', 'i').test(opType)) codeType = "Javascript";

            var Title = 'Code Editor';
            var CodeStr = $input.val();
            var str = `
<div class="modal fade" id="addCodeInfoWksModal" tabindex="-1" role="dialog" aria-labelledby="myCodeModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close pr-3" data-dismiss="modal" aria-label="Close"><i class="fas fa-times fa-xs"></i></button>
                <button type="button" class="close pr-3" aria-label="Fullscreen"><i class="fas fa-expand-alt fa-xs"></i></button>
                <h4 class="modal-title" id="myCodeModalLabel">
                    <div class="col-sm-6">${Title}</div>
                    <div style="font-size: 13px;" class="col-sm-5">
                        Viewing Code as: ${codeType}
                    </div>
                </h4>
            </div>
            <div class="modal-body" style="height: 67vh;">
                <pre id="code-editor"></pre>
                <!-- <pre id="json-editor"></pre> -->
            </div>
            <div class="modal-footer" style="min-height: 60px;">
                <div style="float: left;text-align: left;min-width: 400px;">
                <label>&nbsp;<div style="float:right"></div></label>
            </div>
            <div style="float: right;position: fixed;bottom: 16px;right: -20px;">
                <button type="button" class="btn btn-primary btn-close" data-dismiss="modal" style="width: 100px;">Save</button>
            </div>
            </div>
        </div>
    </div>
</div>`;

            var $modal = $(str);
            var $title = $modal.find('.modal-title');
            var $body = $modal.find('.modal-body');
            var $primaryButton = $modal.find('.btn-primary');
            var $cancelButton = $modal.find('.btn-close');
            var $operatorId = $modal.find('.operator-id');
            var $fullscreenButton = $modal.find('[aria-label="Fullscreen"]');

            $primaryButton.click(function() {
                var $this = $(this);
                if (!$this.hasClass('disabled')) {
                    $input.val($app.ace._AceEditor.getValue());
                    $modal.modal('hide');
                    //$app.triggerEvent('ultiflow::process_change_detected');
                    $app.ultiflow.flowchart.changeDetected();
                }
            });

            $cancelButton.click(function() {
                $modal.modal('hide');
            });

            $fullscreenButton.click(function() { $app.ace._AceEditor.container.requestFullscreen(); });

            $modal.modal();
            $modal.on('hidden.bs.modal', function() {
                $modal.remove();
            });

            $modal.on('shown.bs.modal', function() {
                require(['ace/mode/json', 'ace/theme/vibrant_ink'], function() {
                    var editor = ace.edit("code-editor");
                    editor.setOptions({
                        //maxLines: Infinity, // this is going to be very slow on large documents
                        indentedSoftWrap: false,
                        behavioursEnabled: false, // disable autopairing of brackets and tags
                        showLineNumbers: true, // hide the gutter
                        wrap: false, // wrap text to view
                        mode: "ace/mode/" + codeType.toLowerCase()
                    });
                    //editor.getSession().setMode("ace/mode/json");

                    editor.setTheme("ace/theme/vibrant_ink");
                    editor.setValue(CodeStr, -1);
                    //editor.clearSelection();
                    //editor.setValue(str, -1); // moves cursor to the start
                    //editor.setValue(str, 1); // moves cursor to the end
                    $app.ace = {...$app.ace || {}, ...ace, ... { _AceEditor: editor, _CodeStr: CodeStr } };
                });
            });

        });

        $divs.content.append($input);
        $divs.content.append($btnCodeEditor);

        this.setValue = function(val) {
            $input.val(val);
        };

        this.getValue = function() {
            return $input.val();
        };

        cbReady(self);
    };
});