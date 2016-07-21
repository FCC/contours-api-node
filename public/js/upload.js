$(document).ready(function(){

    var pdf_url = '/';
        pdf_pk = '957e3229-57f8-448c-9674-36c0ec23a14b';
        $body = $('body'),
        $dragArea = $('#upload-drop-area'),
        $files = $body.find('.upload-files'),
        files_q = [],
        files_removed = [],
        files_processing = [],
        files_done = [],
        FileStatus = function(file, obj){

            /* Init and Display File Row */
            var thisFile = this;
            thisFile.file = file;
            thisFile.row = $('<tr class="file-upload info">');
            thisFile.filename = $('<td class="name">').appendTo(thisFile.row);
            thisFile.size = $('<td class="size">').appendTo(thisFile.row);
            thisFile.status = $('<td class="file-status pending">Pending</td>').appendTo(thisFile.row);
            //thisFile.progressBar = $('<div class="progress progress-success progress-striped active"><div class="bar" style="width:0%;"></div></div>').appendTo(thisFile.status);
            thisFile.cancelRow = $('<td class="cancel">').appendTo(thisFile.row);
            thisFile.cancel = $('<button class="btn btn-warning btn-cancel btn-xs pull-right"><i class="icon-ban-circle icon-white"></i><span>Remove</span></button>').appendTo(thisFile.cancelRow);
            thisFile.abort = $('<button class="btn-abort btn btn-danger btn-xs pull-right" style="display: none;"><i class="icon-remove-circle icon-white"></i><span>Abort</span></button>').appendTo(thisFile.cancelRow);
            obj.append(thisFile.row); 

            /* File Object Functions */
            thisFile.setFileNameSize = function(name,size){
                var sizeStr="";
                var sizeKB = size/1024;
                if(parseInt(sizeKB) > 1024)
                {
                    var sizeMB = sizeKB/1024;
                    sizeStr = sizeMB.toFixed(2)+" MB";
                }
                else
                {
                    sizeStr = sizeKB.toFixed(2)+" KB";
                }
         
                thisFile.filename.html(name);
                thisFile.size.html(sizeStr);
            };

            thisFile.setProgress = function(progress){       
                var progressBarWidth =progress*thisFile.progressBar.width()/ 100;  
                thisFile.progressBar.find('.bar').animate({ width: progressBarWidth }, 10);//.html(progress + "% ");
                if(parseInt(progress) >= 100)
                {
                    thisFile.abort.hide();
                }
            };

            thisFile.setAbort = function(jqxhr){
                var sb = thisFile.statusbar;
                thisFile.abort.click(function()
                {
                    jqxhr.abort();
                    sb.hide();
                });
            };

            thisFile.sendFileToServer = function(){
                //thisFile.abort.show();
                thisFile.cancel.hide();
                showProcessingMsg();
                changeArray(files_q, files_processing);
                console.log(JSON.stringify(files_q));

                var fd = new FormData(),
                    uploadURL = pdf_url + "upload",
                    data = {
                        'upload': thisFile.file,
                        'pk': pdf_pk,
                        'conv': 'pdf',
                        'sync': true
                    } //Other Data.
                ;

                for(var key in data) {
                    if(data[key] instanceof Array){
                        data[key] = JSON.stringify(data[key]);
                    }
                    fd.append(key, data[key]);
                }

                $.ajax({
                    url: uploadURL,
                    type: "POST",
                    cache: false,
                    contentType: false,
                    processData: false,
                    data: fd,
                    //beforeSend: function(xhr){xhr.setRequestHeader('Access-Control-Allow-Origin', '*');},
                    /*xhr: function() {
                        var xhrobj = $.ajaxSettings.xhr();
                        if (xhrobj.upload) {
                                xhrobj.upload.addEventListener('progress', function(event) {
                                    var percent = 0;
                                    var position = event.loaded || event.position;
                                    var total = event.total;
                                    if (event.lengthComputable) {
                                        percent = Math.ceil(position / total * 100);
                                    }
                                    //Set progress
                                    thisFile.setProgress(percent);
                                }, false);
                            }
                        return xhrobj;
                    },*/
                    /*progress: function(event, data) {
                        var percent = 0,
                            position = data.loaded,
                            total = data.total;

                        percent = Math.ceil(position / total * 100);
                        console.log('progress!: ' + JSON.stringify(event));

                        //Set progress
                        thisFile.setProgress(percent);
                    },*/
                    success: function(data){
                        //console.log('data: ' + JSON.stringify(data));
                        changeArray(files_processing, files_done);
                        if(data.statusCode == 200){
                            showSuccessMsg('Converted!');
                        } else {
                            showErrorMsg(data.statusMessage);
                        }
                    },
                    error: function(xhr){
                        var errData = JSON.parse(xhr.responseText),
                            errText = errData.statusMessage || errData.errorMessage;

                        changeArray(files_processing, files_done);
                        showErrorMsg(errText);
                    }
                });
            };

            thisFile.removeFile = function(){
                changeArray(files_q, files_removed);
                thisFile.row.remove();
            };

            /* Private Functions for File */
            function showSuccessMsg(msg){
                showMsg(msg, 'success', 'complete');
            };
            function showErrorMsg(msg){
                showMsg(msg, 'danger', 'error');
            };
            function showProcessingMsg(){
                showMsg('Processing', 'warning', 'processing');
            };
            function showMsg(msg, wrapClass, statClass){
                thisFile.row.attr('class', 'file-upload ' + wrapClass);
                thisFile.status
                        .attr('class', 'file-status ' + statClass)
                        .text(msg);
            }
            function changeArray(fromArray, toArray){
                var index = fromArray.indexOf(thisFile);
                fromArray.splice(index, 1);
                toArray.push(thisFile);
            }

            /* Event Listeners on File Row */
            thisFile.cancel.on('click', function(e){
                e.stopPropagation();
                e.preventDefault();

                thisFile.removeFile();

                return false;
            });

            /* Init File Data */
            thisFile.setFileNameSize(thisFile.file.name,thisFile.file.size);

            files_q.push(thisFile);
        },
        addFiles = function(files) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                
                var fileStatus = new FileStatus(file, $files);
            }
        }
    ;


    setSessData = function(sessObject){
        if(sessObject instanceof Object){
            sessData = sessObject;
        }
    }
    setPdfApi = function(url, pk){
        pdf_url = url;
        pdf_pk = pk;
    }
    setBaseUrl = function(url){
        base_url = url;
    }

    $dragArea.on('dragenter', function (e) {
        e.stopPropagation();
        e.preventDefault();
        showDragStyles();

        return false;
    });
    $dragArea.on('dragleave', function (e) {
        e.stopPropagation();
        e.preventDefault();
        removeDragStyles();

        return false;
    });
    $body.on('dragover', function (e) {
        e.stopPropagation();
        e.preventDefault();
        return false;
    });
    $dragArea.on('drop', function (e) {
        e.stopPropagation();
        e.preventDefault();
        removeDragStyles();

        var files = e.originalEvent.dataTransfer.files;

        //Add file to queue
        addFiles(files);

        return false;
    });

    $('.fileinput-button').on('change', 'input[type="file"]', function (e) {
        e.stopPropagation();
        e.preventDefault();
        removeDragStyles();

        var files = $(this)[0].files;

        //Add file to queue
        addFiles(files);

        return false;
    });

    $('.start-select-all').click(function(e){
        e.stopPropagation();
        e.preventDefault();
        console.log(JSON.stringify(files_q));

        var queuedFiles = files_q.slice(0);
     
        //upload queued files
        //handleFileUpload(files_q);
        queuedFiles.forEach(function(fileStat){
            fileStat.sendFileToServer();
        });

        return false;
    });

    function showDragStyles(){
        $dragArea.addClass('dragover');
    }

    function removeDragStyles(){
        $dragArea.removeClass('dragover');
    }

});