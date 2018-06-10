var obj = {};
var models = [];
var datasets = [];
var file;
var dnd = 0;
var zipFile = {};
var otherLabels = [];
var doneLabels = [];
var predictedLabel = '';
var canvas = document.getElementById("od-new-img-canvas");
var ctx = canvas.getContext("2d");
var canvasImgSrc = '';
var annotations = {};
var squares = [];
var imgList = [];
var dtLabelList = [];
var canvasMouseMode = 'new';
var targetCanvasAnnotation = {};
var input_key_buffer = [];
var gridMode = true;
var labelMode = true;
var viewMode = true;
var objectDetectionResultAnnotations = [];
document.onkeydown = function (e){
	if(!e) e = window.event;
	input_key_buffer[e.keyCode] = true;
	if (e.keyCode == 71 || e.keyCode == 76 || e.keyCode == 86){
		if ($('.modal.in').is(':visible') == false && ($('#object-detection-page').hasClass('active') || $('#new-object-detection-page').hasClass('active'))){
			if (e.keyCode == 71) gridMode = !gridMode;
			if (e.keyCode == 76) labelMode = !labelMode;
			if (e.keyCode == 86) viewMode = !viewMode;
			if ($('#object-detection-page').hasClass('active')){
				initPredictCanvas();
			} else if ($('#new-object-detection-page').hasClass('active')){
				initCanvas();
			}
		}
	}
};
document.onkeyup = function (e){
	if(!e) e = window.event;
	input_key_buffer[e.keyCode] = false;
};
window.onblur = function (){
	input_key_buffer.length = 0;
};
function isKeyDown(key_code){
	if(input_key_buffer[key_code])	return true;
	return false;
}

$(function(){
	var x = 0;
	var y = 0;
	var _x;
	var _y;

	$('#od-new-img-canvas').mousedown(function(e){
		var labelId = $('.dt-label.active').attr('data-id');
		if(labelId != null && labelId.length > 0){
			var railhead = e.target.getBoundingClientRect();
			x = e.clientX-railhead.left;
			y = e.clientY-railhead.top;
			_x = x;
			_y = y;
			canvasMouseMode = 'new';
			for (var i = 0; i < squares.length; i ++){
				var sq = squares[i];
				if (x < sq.x + 4 && x > sq.x - 4 && y < sq.y + 4 && y > sq.y - 4){
					x = sq.s_x;
					y = sq.s_y;
					console.log('detect');
					canvasMouseMode = 
					sq.type == 'square' ? 'edit':
					sq.type == 'center' ? 'move':
					'new';
					targetCanvasAnnotation = {
						id: sq.id,
						label : sq.label,
						w : sq.w,
						h : sq.h
					};
					break;
				}
			}
			$('#od-new-img-canvas').bind('mousemove',function(e){
				var railhead = e.target.getBoundingClientRect();
				_x = e.clientX-railhead.left;
				_y = e.clientY-railhead.top;
				var thisRect = 
				canvasMouseMode == 'move' ? [_x - (targetCanvasAnnotation.w / 2), _y - (targetCanvasAnnotation.h / 2), targetCanvasAnnotation.w, targetCanvasAnnotation.h]:
				[x, y, _x-x, _y-y];
				initCanvas(null, thisRect);
			});
		} else {
			alert('No Label detected. Please create some Labels at first.');
		}
	});

	$('#od-new-img-canvas').mouseup(function(){
		$('#od-new-img-canvas').unbind('mousemove');
		var targetFile = $('#od-new-img-canvas').attr('data-file');
		var ww;
		var hh;
		var xx;
		var yy;
		if (canvasMouseMode == 'move'){
			xx = _x - (targetCanvasAnnotation.w / 2);
			yy = _y - (targetCanvasAnnotation.h / 2);
			ww = targetCanvasAnnotation.w;
			hh = targetCanvasAnnotation.h;
		} else {
			xx = x;
			yy = y;
			ww = _x - x;
			hh = _y - y;
		}
		createLabelAnnotation(targetFile, xx, yy, ww, hh, isKeyDown(16));
	});

	$(window).on('resize', function(){
		initCanvas();
	});
	$(document).on('click','.init-canvas-trigger', function(){
		//initCanvas();
	});

	$(document).on('shown.bs.modal','.modal', function(){
		if ($('.modal.in input:text')[0]) $('.modal.in input:text')[0].focus();

	});	

	$(document).on('submit','.modal form', function(){
		if ($('.modal.in a.btn.btn-primary')[0]) $('.modal.in a.btn.btn-primary')[0].click();
		return false;
	});	

	$(document).on('dragover', 'body', function(e){
		e.preventDefault();
		e.stopPropagation();
		dnd ++;
	});
	$(document).on('dragenter', 'body', function(e){
		e.preventDefault();
		$('#mydd').addClass('active');
		e.stopPropagation();
		dnd ++;
	});
	$(document).on('dragleave', 'body', function(e){	
		e.preventDefault();
		e.stopPropagation();
		dnd = 0;
		setTimeout(function(){
			if (dnd == 0) $('#mydd').removeClass('active');
		},100);

	});
	$(document).on('drop', 'body' ,function(e){	
		$('#mydd').removeClass('active');
		e.preventDefault();
		var dataTransfer =  e.originalEvent.dataTransfer;
		if ($('#new-object-detection-page').hasClass('active')) uploadedImgFiles(dataTransfer);
		return false;	
	});	
	$(document).on('change','#dummy-nod-files',function(e){
		uploadedImgFiles(e.target);
	});

	$(document).on('click','.create-dt-model-btn:not(.disabled)', function(){
		var thisCsvObject = JSON.stringify(createDtModel());
		var res = majax({
			csv :thisCsvObject
		}, 'csv2zip', function(dat){
			$('#mymodal5').modal('show');
			$('#od-cm-td-name').text(dat.name);
			$('#od-cm-td-url').attr('href', dat.url);
		});	
	});

	$(document).on('click','.dt-label:not(.active)', function(){
		$('.dt-label').removeClass('active');
		$(this).addClass('active');
	});

	$(document).on('click','.od-new-label-button:not(.disabled)', function(){
		$('#newDtLabelName').val('');
		$('#mymodal2').modal('show');
	});
	$(document).on('click','.edit-dt-label:not(.disabled)', function(){
		$('#changeDtLabelName').val(dtLabelList[$(this).attr('data-id')]);
		$('#changeDtLabelId').val($(this).attr('data-id'));
		$('#mymodal3').modal('show');
	});



	
	$(document).on('click','.label-annotation:not(.disabled)', function(){
		var fileName = $('#od-new-img-canvas').attr('data-file');
		var annId = $(this).attr('data-id');
		if (fileName && annId){
			var labelId = annotations[fileName][annId].label;
			$('#changeAnnotationFile').val(fileName);
			$('#changeAnnotationId').val(annId);
			$('#changeAnnotationLabelId').empty();
			var ih = '';
			for (var i=0; i<dtLabelList.length; i++){
				var selected =
				labelId == dtLabelList[i] ? ' selected': '';
				ih += '<option value="' + dtLabelList[i] + '"' + selected + '>' + dtLabelList[i] + '</option>';
			}
			$('#changeAnnotationLabelId').append(ih);
			$('#mymodal4').modal('show');
		}
	});

	$(document).on('change','#changeAnnotationLabelId', function(){
		changeLabelAnnotation();
	});

	$(document).on('click','.new-dt-label-btn:not(.disabled)', function(){
		var labelName = $('#newDtLabelName').val();
		if (dtLabelList.indexOf(labelName) == -1){
			newDtLabel(labelName);
		} else {
			alert('Label "' + labelName + '" is already existed.');
		}
	});


	$(document).on('click','.change-dt-label-btn:not(.disabled)', function(){
		var labelName = $('#changeDtLabelName').val();
		var labelId = $('#changeDtLabelId').val();
		if (dtLabelList.indexOf(labelName) == -1 || dtLabelList.indexOf(labelName) == labelId){
			changeDtLabel(labelId, labelName);
		} else {
			alert('Label "' + labelName + '" is already existed.');
		}
	});

	$(document).on('click','.del-label-annotation:not(.disabled)', function(){
		delLabelAnnotation($(this).attr('data-id'));
	});


	$(document).on('click','.del-dt-label:not(.disabled)', function(){
		if(window.confirm('Are you sure you want to delete it?')){
			delDtLabel($(this).attr('data-id'));
		}
	});

	
	$(document).on('click','.od-new-img-select:not(.disabled)', function(){
		$('.od-new-img-select').removeClass('active');
		$(this).addClass('active');
		canvasImgSrc = $(this).attr('data-url');
		$('#od-new-img-canvas').attr('data-file', $(this).attr('data-file'));
		renderLabelAnnotations($(this).attr('data-file'));
		resetSquares($(this).attr('data-file'));
		initCanvas();

	});
	$(document).on('mouseover','.label-annotation-area', function(){	
		var elm = $(this);
		//console.log(elm.attr('data-id'));
		initCanvas(elm.attr('data-id'));
	});
	$(document).on('mouseout','.label-annotation-area', function(){	
		initCanvas();
	});
	$(document).on('click','.feedback-finish:not(.disabled)', function(){
		feedbackFinish();
	});
	$(document).on('click','.myimg', function(){
		$('#dummy-img-file').click();
	});
	$(document).on('click','.btn-open-file', function(){
		$('#dummy-nod-files').click();
	});
	
	$(document).on('click','.upload-pky-button', function(){
		$('#dummy-pky-file').click();
	});
	$(document).on('click','.zip-select-btn',function(){
		$('#dummy-zip-file').click();
	});
	$(document).on('click','.create-new-model-button:not(.disabled)',function(){
		$('#mymodal').modal('show');
	});

	$(document).on('click','.change-page:not(.disabled)',function(){
		var target = $(this).data('target');
		goTo(target);
	});

	$(document).on('click','.reload-models:not(.disabled)',function(){
		getModels();
	});
});

function changeAnnotationLabel(orgLabel, newLabel){
	for (var key in annotations){
		if(annotations.hasOwnProperty(key)){
			var anns = annotations[key];
			var annSize = anns.length;
			for (var i = 0; i < annSize; i ++){
				var ann = anns[i];
				if (ann.label == orgLabel) annotations[key][i].label = newLabel;
			}
		}
	}
	renderLabelAnnotations($('#od-new-img-canvas').attr('data-file'));
}

function createDtModel(){
	var csvObj = {
		boxMax : 1,
		file : {},
		element : {},
		csv : ''
	};
	for (var key in annotations){
		if(annotations.hasOwnProperty(key)){
			var anns = annotations[key];
			var annSize = anns.length;
			if (annSize > 0){
				if (csvObj.boxMax < annSize) csvObj.boxMax = annSize;
				csvObj.element[key] = [];
				csvObj.file[key] = [];
				for (var i = 0; i < annSize; i ++){
					var ann = anns[i];
					csvObj.element[key].push(
						'"{""label"":""' + ann.label + 
						'"",""y"":' + Math.round(ann.y) + 
						',""x"":' + Math.round(ann.x) + 
						',""height"":' + Math.round(ann.height) + 
						',""width"":' + Math.round(ann.width) + 
						'}"'
						);
					csvObj.file[key].push({
						x : Math.round(ann.x),
						y : Math.round(ann.y),
						height : Math.round(ann.height),
						width : Math.round(ann.width),
						label : ann.label
					});
				}
			}
		}
	}
	var csvFile = '';
	csvFile += '"image_file"';
	for (var i = 1; i < (csvObj.boxMax + 1); i ++){
		csvFile += ',"box' + i + '"';
	}
	csvFile += '\r\n';
	for (var key in csvObj.element){
		if(csvObj.element.hasOwnProperty(key)){
			csvFile += '"' + key + '",' + csvObj.element[key].join(',') + '\r\n';
		}
	}
	csvObj.csv = csvFile;
	return csvObj;
}


function newDtLabel(labelName){
	dtLabelList.push(labelName);
	renderLabelList(true);
	$('#mymodal2').modal('hide');
}

function changeDtLabel(labelId, labelName){
	var orgLabelName = dtLabelList[labelId];
	dtLabelList[labelId] = labelName;
	renderLabelList(false);
	changeAnnotationLabel(orgLabelName, labelName);
	$('#mymodal3').modal('hide');
}

function createLabelAnnotation(targetFile, x, y, w, h, shiftKey){
	var anns = annotations[targetFile];
	if (anns == null){
		annotations[targetFile] = [];
	}
	var xx = w < 0 ? x + w : x;
	var yy = h < 0 ? y + h : y;
	var ww = Math.abs(w);
	var hh = Math.abs(h);
	var obj = {
		x : convCanvas2Img(xx),
		y : convCanvas2Img(yy),
		width : convCanvas2Img(ww),
		height : convCanvas2Img(hh)
	};
	if (canvasMouseMode == 'edit'){
		obj.label = targetCanvasAnnotation.label;
		if (ww > 2 && hh > 2){
			annotations[targetFile][targetCanvasAnnotation.id] = obj;
		}
	} else if (canvasMouseMode == 'move'){
		obj.label = targetCanvasAnnotation.label;
		if (shiftKey){
			annotations[targetFile].push(obj);
		} else {
			annotations[targetFile][targetCanvasAnnotation.id] = obj;
		}

	} else if (canvasMouseMode == 'new') {
		var labelId = $('.dt-label.active').attr('data-id');
		if (labelId && ww > 2 && hh > 2){
			obj.label = labelId;
			annotations[targetFile].push(obj);			
		}
	}
	canvasMouseMode = 'new';
	resetSquares(targetFile);
	renderLabelAnnotations(targetFile);
	initCanvas();
	checkAnnotationCount();
}
function checkAnnotationCount(){
	var falseCount = 0;
	var count = {};
	for (var i = 0; i < dtLabelList.length; i ++){
		count[dtLabelList[i]] = 0;
	}
	for (var key in annotations){
		if(annotations.hasOwnProperty(key)){
			var anns = annotations[key];
			for (var i = 0; i < anns.length; i ++){
				var ann = anns[i];
				count[ann.label] += 1;
			}
		}
	}
	for (var i = 0; i < dtLabelList.length; i ++){
		var thisCount = count[dtLabelList[i]];
		$('#dt-label-count-' + i).text(' (' + thisCount + ')');
		if (thisCount < 1){
			falseCount++;
		}
	}
	if (falseCount == 0){
		if($('#create-dt-model-btn').hasClass('disabled')){
			$('.save-complete-btn').removeClass('disabled');
		}
	} else {
		if(!($('#create-dt-model-btn').hasClass('disabled'))){
			$('.save-complete-btn').addClass('disabled');
		}
	}
	
}

function convCanvas2Img(x){
	var imgWidth = $('#od-new-img-canvas').attr('data-img-width');
	var canvasWidth = canvas.width;
	return (x * imgWidth / canvasWidth);
}
function convImg2Canvas(x){
	var imgWidth = $('#od-new-img-canvas').attr('data-img-width');
	var canvasWidth = canvas.width;
	return (x * canvasWidth / imgWidth);
}
function resetSquares(key){
	squares = [];
	var anns = annotations[key];
	for (var i=0; i<anns.length; i++){
		var ann = anns[i];
		var x = convImg2Canvas(ann.x);
		var y = convImg2Canvas(ann.y);
		var w = convImg2Canvas(ann.width);
		var h = convImg2Canvas(ann.height);
		var label = ann.label;
		squares.push({
			x : x,
			y : y,
			s_x : x + w,
			s_y : y + h,
			label : label,
			file : key,
			id : i,
			type : 'square'
		});
		squares.push({
			x : x,
			y : y + h,
			s_x : x + w,
			s_y : y,
			label : label,
			file : key,
			id : i,
			type : 'square'
		});
		squares.push({
			x : x + w,
			y : y,
			s_x : x,
			s_y : y + h,
			label : label,
			file : key,
			id : i,
			type : 'square'
		});
		squares.push({
			x : x + w,
			y : y + h,
			s_x : x,
			s_y : y,
			label : label,
			file : key,
			id : i,
			type : 'square'
		});
		squares.push({
			x : x + (w / 2),
			y : y + (h / 2),
			s_x : x,
			s_y : y,
			w : w,
			h : h,
			label : label,
			file : key,
			id : i,
			type : 'center'
		});
	}
}

function renderLabelList(updated){
	$('#od-new-img-dt-label-list').empty();
	for (var i = 0; i < dtLabelList.length; i ++){
		var label = dtLabelList[i];
		$('#od-new-img-dt-label-list').append(elmDtLabel(i, label));
	}

	if($('.dt-label.active').length == 0){
		var ntarget = updated ? 'last' : 'first';
		$('.dt-label:' + ntarget).addClass('active');
	} 


}
function renderLabelAnnotations(targetFile){
	var anns = annotations[targetFile];
	$('#od-new-img-label-list').empty();
	if (anns != null){
		for (var i = 0; i < anns.length; i ++){
			var ann = anns[i];
			//console.log(ann);
			$('#od-new-img-label-list').append(elmLabelAnnotaion(i, ann));
		}
	}
}
function delLabelAnnotation(id){
	var targetFile = $('#od-new-img-canvas').attr('data-file');
	var anns = annotations[targetFile];
	anns.splice(id, 1);
	renderLabelAnnotations(targetFile);	
	checkAnnotationCount();
	initCanvas();
}

function changeLabelAnnotation(){
	var fileName = $('#changeAnnotationFile').val();
	var annId = $('#changeAnnotationId').val();
	var labelId = $('#changeAnnotationLabelId').val();
	annotations[fileName][annId].label = labelId;
	renderLabelAnnotations(fileName);
	$('#mymodal4').modal('hide');
	initCanvas();
	checkAnnotationCount();
}
function delDtLabel(id){
	dtLabelList.splice(id, 1);
	resetAnnotations();
	renderLabelList();
	initCanvas();
}

function resetAnnotations(){
	for (var key in annotations){
		if (annotations.hasOwnProperty(key)){
			var anns = annotations[key];
			var newList = [];
			for (var i=0; i<anns.length; i++){
				var ann = anns[i];
				if (dtLabelList[ann.label] != null && dtLabelList[ann.label].length > 1){
					newList.push(ann);
				}
			}
			annotations[key] = newList;
		}
	}
}
function elmDtLabel(i, label){
	var ret = 
	'<button class="btn btn-default dt-label" data-id="' + label + '">' + 
	'<span>' + label + '</span><span id="dt-label-count-' + i + '"></span>' +
	'<span><a href="#" class="edit-dt-label" data-id="' + i + '"> <i class="fa fa-pencil" aria-hidden="true"></i></a></span>' + 
	'</button>';
	return ret;
}
function elmLabelAnnotaion(i, ann){
	var ret =
	'<div class="label-annotation-area" data-id="' + i + '">' +  
	'<span class="badge label-annotation" data-id="' + i + '">' + 
	'<span>' + ann.label + '</span>' +
	'</span>' +
	'<span><a href="#" class="del-label-annotation" data-id="' + i + '"> <i class="fa fa-times" aria-hidden="true"></i></a></span>' +
	'</div>';
	return ret;
}

function initCanvas(focusId, selecting){
	if (canvasImgSrc != null && canvasImgSrc.length > 2){
		var img = new Image();
		img.onload = function () {
			var tw, th;
			if (viewMode){
				tw = $('#od-new-img-canvas').parent().width();
				th = tw * img.height / img.width;	
			} else {
				th = window.innerHeight - 260;
				tw = th * img.width / img.height;	

			}
			$('#dt-create-canvas-container').css('height', th + 'px');
			$('#od-new-img-canvas').attr('data-img-width', img.width);
			$('#od-new-img-canvas').attr('data-img-height', img.height);
			canvas.width = tw;
			canvas.height = th;
			ctx.drawImage(img, 0, 0, tw, th);

			  	if (gridMode) drawGrid(tw, th, ctx);

			  	var targetFile = $('#od-new-img-canvas').attr('data-file');
			  	var anns = annotations[targetFile];
			  	if (anns != null){
			  		for (var i = 0; i < anns.length; i ++){
			  			var color = 
			  			focusId && focusId == i ? 'rgb(208,52,132)' :
			  			canvasMouseMode == 'edit' && targetCanvasAnnotation.id == i ? 'rgb(160,255,0)':
			  			'rgb(160,255,0)';
			  			var ann = anns[i];
			  			mystrokeRect(
			  				convImg2Canvas(ann.x) + 0.5,
			  				convImg2Canvas(ann.y) + 0.5,
			  				convImg2Canvas(ann.width),
			  				convImg2Canvas(ann.height),
			  				color, true, ann.label
			  				);
			  		}
			  	}
			  	if (selecting){
			  		var color = 'rgb(208,52,132)';
			  		mystrokeRect(selecting[0], selecting[1], selecting[2], selecting[3], color);
			  	}
			  }
			  img.src = canvasImgSrc;
			}
		}



		function drawGrid(w, h, tctx){
	// filter
	tctx.fillStyle = "rgba(0, 0, 0, .3)";
	tctx.fillRect(0, 0, w, h);

	// grid lines
	tctx.strokeStyle = 'rgba(255,255,255,.5)';
	tctx.lineWidth = 0.1;	
	for (var i=1; i < (w / 15); i ++){
		var x = i * 15;
		tctx.beginPath();
		tctx.moveTo(x + 0.5, 0 + 0.5);
		tctx.lineTo(x + 0.5, h + 0.5);
		tctx.closePath();
		tctx.stroke();
	}
	for (var i=1; i < (h / 15); i ++){
		var y = i * 15;
		tctx.beginPath();
		tctx.moveTo(0 + 0.5, y + 0.5);
		tctx.lineTo(w + 0.5, y + 0.5);
		tctx.closePath();
		tctx.stroke();
	}
	tctx.lineWidth = 0.12;	
	for (var i=1; i < (w / 75); i ++){
		var x = i * 75;
		tctx.beginPath();
		tctx.moveTo(x + 0.5, 0 + 0.5);
		tctx.lineTo(x + 0.5, h + 0.5);
		tctx.closePath();
		tctx.stroke();
	}
	for (var i=1; i < (h / 75); i ++){
		var y = i * 75;
		tctx.beginPath();
		tctx.moveTo(0 + 0.5, y + 0.5);
		tctx.lineTo(w + 0.5, y + 0.5);
		tctx.closePath();
		tctx.stroke();
	}
	tctx.lineWidth = 0.18;	
	tctx.strokeStyle = 'rgba(255,255,255,.5)';
	for (var i=1; i < (w / 150); i ++){
		var x = i * 150;
		tctx.beginPath();
		tctx.moveTo(x + 0.5, 0 + 0.5);
		tctx.lineTo(x + 0.5, h + 0.5);
		tctx.closePath();
		tctx.stroke();
	}
	for (var i=1; i < (h / 150); i ++){
		var y = i * 150;
		tctx.beginPath();
		tctx.moveTo(0 + 0.5, y + 0.5);
		tctx.lineTo(w + 0.5, y + 0.5);
		tctx.closePath();
		tctx.stroke();
	}
}


function mystrokeRect(x, y, w, h, color, expand, label){
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.strokeRect(x, y, w, h);
	if (expand){

		if (labelMode && label && label.length > 0){
			ctx.font="15px Arial";
			ctx.fillStyle = 'rgba(0, 0, 0, .5)';
			var wi = ctx.measureText(label).width;
			ctx.fillRect(x, (y - 20), (wi + 10), 20);
			ctx.textBaseline = 'middle';
			ctx.fillStyle = color;
			ctx.fillText(label, (x + 5), (y - 10));
		}


		var target = [[x,y], [x,y+h], [x+w,y], [x+w,y+h]];
		for (var i = 0; i < target.length; i++){
			var t_x = target[i][0];
			var t_y = target[i][1];
			ctx.strokeRect(t_x - 4, t_y - 4, 8, 8);
		}

		ctx.beginPath();
		ctx.moveTo(x + (w / 2) - 5, y + (h / 2));
		ctx.lineTo(x + (w / 2) + 5, y + (h / 2));
		ctx.closePath();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(x + (w / 2), y + (h / 2) - 5);
		ctx.lineTo(x + (w / 2), y + (h / 2) + 5);
		ctx.closePath();
		ctx.stroke();

	}
}
function convProbabilityToOpacity(probability){
	return Math.round(probability) / 100;
}



function uploadedImgFiles(dataTransfer){

	if(dataTransfer && dataTransfer.files.length) {
		//imgList = [];
		for (var i = 0; i < dataTransfer.files.length; i ++){
			var file = dataTransfer.files[i];
			var fileName = file.name;
			var reader = new FileReader();
			reader.onload = (function(theFile, theFileName) {
				return function(e) {
					console.log('File type: ' + theFile.type);
					if (theFile.type.match('image.*')){
						//
						// Image file 
						//
						var b64 = e.target.result.split(',')[1];
						console.log('Filename: ' + theFileName);
						console.log('length: ' + b64.length);
						var res = majax({
							auth : obj,
							fileName : theFileName,
							b64 : b64
						}, 'save', function(dat){
							console.log(dat);
							addImgElement(dat);
							odNewsSelectImg(dat);							
						});	
					} else if (theFile.type == 'application/zip'){
						//
						// Zip file 
						//
						if(window.confirm('After loading zip file, current works will be disappeared. Are you sure to want to load the zip file?')){
							dtLabelList = [];
							annotations = {};
							$('#od-new-img-t-list').html('');

							var b64 = e.target.result.split(',')[1];
							var res = majax({
								auth : obj,
								fileName : theFileName,
								b64 : b64
							}, 'save_zip', function(dat){
								loadZipData(dat);
							});
						}
					}
				}
			})(file, fileName);
			reader.readAsDataURL(file);
		}
	}

}

function loadZipData(dat){
	console.log(dat);
	var files = dat.files;
	for(var i = 0; i < files.length; i ++){
		addImgElement(files[i]);
	}
	annotations = dat.csv;
	for(key in annotations){
		if(annotations.hasOwnProperty(key)){
			var anns = annotations[key];
			for(var j=0; j < anns.length; j++){
				var ann = anns[j];
				if(dtLabelList.indexOf(ann.label) == -1){
					newDtLabel(ann.label);
				}
			}

		}
	}
	odNewsSelectImg(files[0]);
	checkAnnotationCount();	

}

function odNewsSelectImg(dat){
	$('.od-new-img-select[data-file="' + dat + '"]').click();
}


function addImgElement(dat){
	var thisUrl = location.origin + '/spool/' + dat;
	var dom = 
	'<a href="#" class="thumbnail od-new-img-select" data-file="' + dat + '" data-url="' + thisUrl + '">' +
	'<img id="od-new-img-e-' + dat + '" src="' + thisUrl + '"/>' +
	'<div class="caption"><h4>' + dat + '</h4></div>' +
	'</a>';
	if (imgList.indexOf(dat) == -1){
		imgList.push(dat);			
		$('#od-new-img-t-list').append(dom);
		annotations[dat] = [];
	}

}


function startLoading(){
	$('#myloading').removeClass('hidden');
}
function stopLoading(){
	$('#myloading').addClass('hidden');
}
function er(mes){
	alert(mes);
}
function majax(data0, target, callback){
	startLoading();
	$.ajax({
		type: 'POST',
		data: JSON.stringify(data0),
		contentType: 'application/json',
		url: window.location.origin + '/' + target,						
		success: function(data) {
			stopLoading();
			if (data.error && data.error.length > 1 || data.errorCode && data.errorCode.length > 1){
				window.setTimeout(function(){
					alert(data.error + ' : ' + data.error_description);
				}, 100);
			} else {
				if (data && data.message && data.message.length > 0){
					alert('API message : ' + data.message);
				}
				callback(data);
			}
		},
		error: function(req, status, err){
			stopLoading();
			window.setTimeout(function(){
				alert('ERROR! : ' + status + ' : ' + err.message);
			}, 100);
		}
	});	
}




