/*** Imports ***/
var papaya = papaya || {};
papaya.viewer = papaya.viewer || {};



/*** Constructor ***/
papaya.viewer.Mip = papaya.viewer.Mip || function (width, height, screenVols) {
        this.screenVolumes = screenVols;
        this.xDim = width;
        this.yDim = height;
    };

papaya.viewer.Mip.getVectorLength = function (vector) {
    return Math.sqrt(vector[0]*vector[0] + vector[1]*vector[1]);
};

papaya.viewer.Mip.getDistanceBetweenTwoPoints = function (firstPoint, secondPoint) {
    var vectorBetweenTwoPoints = [firstPoint[0] - secondPoint[0], firstPoint[1] - secondPoint[1]];
    return papaya.viewer.Mip.getVectorLength(vectorBetweenTwoPoints);
};

papaya.viewer.Mip.getEndPoints = function (directionVector, pointOnLine, width, height, eye){
    var normVector = [directionVector[1], directionVector[0]*(-1)];
    var c = normVector[0]*pointOnLine[0] + normVector[1]*pointOnLine[1];
    // Array that contains the viewport's four boundary lines' intersections with the crossing line
    var hit = [];
    var epsilon = 1;

    // In the first case the line is horizontal, in the second it is vertical, in the third it is diagonal,
    // therefore the number of intersections change accordingly. The intersections can be calculated from the
    // equation of the a line that can be given from the normal vector and a point on the line
    if(Math.abs(directionVector[1]) < epsilon) {
        hit[0] = [0, pointOnLine[1]];
        hit[1] = [width, pointOnLine[1]];
    } else if (Math.abs(directionVector[0]) < epsilon) {
        hit[0] = [pointOnLine[0], 0];
        hit[1] = [pointOnLine[0], height];
    } else {
        hit[0] = [0, c/normVector[1]];
        hit[1] = [c/normVector[0], 0];
        hit[2] = [width, (c-normVector[0]*width)/normVector[1]];
        hit[3] = [(c-normVector[1]*height)/normVector[0], height];
    }

    var endPoints = [];

    // If there are two intersections the endpoints are clear, but if there is more it should be investigated
    // which two is on the boundary of the viewport
    if(hit.length === 2) { //TODO: multiple checks  not needed
        endPoints.push(hit[0]);
        endPoints.push(hit[1]);
    } else {
        for(var i = 0; i < hit.length; i++){
            if(hit[i][0] >= 0 && hit[i][0] <= width && hit[i][1] >= 0 && hit[i][1] <= height) {
                endPoints.push(hit[i]);
            }
        }
    }

    //In case the line is not crossing the slice
    if(endPoints.length < 2) {
        endPoints[0] = [0,0];
        endPoints[1] = [0,0];
    }else if(papaya.viewer.Mip.getDistanceBetweenTwoPoints(endPoints[0], eye) > papaya.viewer.Mip.getDistanceBetweenTwoPoints(endPoints[1], eye)) {
        endPoints.reverse(); //TODO: examine only once
    }

    return endPoints;
};

papaya.viewer.Mip.renderMip = function(pixels, MipRotationImage, cols, rows, slices, alpha, lineLength){

    var diagonal = Math.round(Math.sqrt(rows*rows + cols*cols));
    var distanceBetweenCenterAndEye = Math.round(diagonal*0.7); //TODO: is this the optimal?
    const center = [rows/2, cols/2];
    var eye = [center[0] + Math.cos(alpha)*distanceBetweenCenterAndEye, center[1]+Math.sin(alpha)*distanceBetweenCenterAndEye];

    var pointsOnLine = new Array(lineLength+1);

    var direction = [center[0]-eye[0], center[1]-eye[1]];
    var directionLength = Math.sqrt(direction[0]*direction[0]+direction[1]*direction[1]);
    var normDirection = [direction[0]/directionLength, direction[1]/directionLength];
    var normNormalVector = [normDirection[1], -normDirection[0]];

    //recalculating points on line based on changing angle
    pointsOnLine[ Math.round(lineLength/2)] = eye;
    for(var i = 0; i < Math.round(lineLength/2); i++){
        pointsOnLine[Math.round(lineLength/2)+i+1] = [eye[0]+normNormalVector[0]*(i+1), eye[1]+normNormalVector[1]*(i+1)]; //TODO: adding instead of multiplication
        pointsOnLine[Math.round(lineLength/2)-i-1] = [eye[0]-normNormalVector[0]*(i+1), eye[1]-normNormalVector[1]*(i+1)];
    }

    //   var pointsOnLineLenght = pointsOnLine.length;

    var endPoints = new Array(lineLength);
    var distanceBetweenEndpoints = new Array(lineLength);
    for(var i = 0; i < lineLength; i++) {
        endPoints[i] = papaya.viewer.Mip.getEndPoints(direction, pointsOnLine[i], rows, cols, eye);
        distanceBetweenEndpoints[i] = Math.round(Math.sqrt(Math.pow(endPoints[i][0][0] - endPoints[i][1][0], 2) + Math.pow(endPoints[i][0][1] - endPoints[i][1][1], 2)));
    }

    //calculate the lines that are needed to observed for the maximum value
    for(var oneSlice = 0; oneSlice < slices; oneSlice++){
        for(var i = 0; i < endPoints.length; i++){
            var maxIntensityOnSliceInDirection = 0;
            for(var j = 0; j < distanceBetweenEndpoints[i]; j++){
                var newPointLocation=[Math.round(endPoints[i][0][0]+normDirection[0]*j),Math.round(endPoints[i][0][1]+normDirection[1]*j)]; //TODO:
                var pixelIntensity = pixels[oneSlice*rows*cols + cols*newPointLocation[0] + newPointLocation[1]]; //TODO: szorzás el?re kiszámol
                if(pixelIntensity > maxIntensityOnSliceInDirection){
                    maxIntensityOnSliceInDirection = pixelIntensity;
                }
            }

            MipRotationImage[oneSlice*lineLength+i] = maxIntensityOnSliceInDirection;
        }
    }
};

papaya.viewer.Mip.renderMipAsm = Module.cwrap('renderMIP', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']);
mipBuffer = 0;

papaya.viewer.Mip.updateMip = function(initialAngle, mipSlice) {
    var cols = mipSlice.screenVolumes[0].volume.header.imageDimensions.cols;
    var rows = mipSlice.screenVolumes[0].volume.header.imageDimensions.rows;
    var slices = mipSlice.screenVolumes[0].volume.header.imageDimensions.slices;
    var pixels = mipSlice.screenVolumes[0].volume.imageData.data;
    console.log("Rows: " + rows + ", Cols: " + cols + ", Slices: " + slices);

    var alpha = initialAngle;
    var diagonal = Math.round(Math.sqrt(rows*rows + cols*cols));
    var lineLength =  Math.round(diagonal*1.2); //TODO: is this the optimal?

    var c = document.getElementById("myCanvas2");
    var ctx = c.getContext("2d");
    imageDataHekk = ctx.createImageData(lineLength, slices);
	ctx.canvas.width = lineLength;
	ctx.canvas.height = slices;
    c.style.width = lineLength + "px";
    c.style.height = slices + "px";
    var MipRotationImage = [];
	if(volBuffer === 0 || pixBuffer !== pixels){
			// initial load, or the volume has changed
			if(volBuffer !== 0) {
				Module._free(volBuffer);
			}
			volBuffer = Module._malloc(pixels.length*pixels.BYTES_PER_ELEMENT);
			Module.HEAPU8.set(pixels, volBuffer);
			
			pixBuffer = pixels;
		}

        const mipSize = lineLength*slices;
		if(mipBuffer !== 0){
			Module._free(mipBuffer);
		}
        mipBuffer = Module._malloc(mipSize);

    if(localStorage.getItem('asmMIP') == 'true'){
        // c++ asm.js version
        console.log("Asm.js rendering enabled");
        console.log("volBuffer: "+volBuffer +" mipBuffer: "+mipBuffer);
        papaya.viewer.Mip.renderMipAsm(volBuffer, mipBuffer, cols, rows, slices, alpha, lineLength);
        for(var i = 0; i < mipSize; i++){
            MipRotationImage[i] = Module.HEAPU8[mipBuffer+i];
        }
    }else{
        // javascript version
        papaya.viewer.Mip.renderMip(pixels, MipRotationImage, cols, rows, slices, alpha, lineLength);
    }

    for(var i = 0; i < MipRotationImage.length; i++){
        //this.imageData[ctr][i] = displayedImage[i];
        var intensity = (MipRotationImage[i]*MipRotationImage[i])/300;
        imageDataHekk.data[i*4] = intensity;
        imageDataHekk.data[i*4+1] = intensity;
        imageDataHekk.data[i*4+2] = intensity;
        imageDataHekk.data[i*4+3] = 255;
    }

    ctx.putImageData(imageDataHekk, 0, 0);

    var isMouseDown = false;

    c.addEventListener("mouseup", function (ev){
        isMouseDown = false;
    });

    c.addEventListener("mousedown", function(ev){
        isMouseDown = true;
    });

    c.addEventListener('mousemove', function(ev){
        if(isMouseDown){
            var start = performance.now();
            alpha = alpha+ev.movementX/80;
            imageDataHekk = ctx.createImageData(lineLength, slices);
            var MipRotationImage = [];

            var beforeRendering = performance.now();
            if(localStorage.getItem('asmMIP') == 'true'){
                // c++ asm.js version
                papaya.viewer.Mip.renderMipAsm(volBuffer, mipBuffer, cols, rows, slices, alpha, lineLength);
                const mipSize = lineLength*slices;
                for(var i=0; i < mipSize; i++){
                    MipRotationImage[i] = Module.HEAPU8[mipBuffer+i];
                }
                //MipRotationImage = Module.HEAPU8.subarray(mipBuffer, mipSize);
            } else {
                papaya.viewer.Mip.renderMip(pixels, MipRotationImage, cols, rows, slices, alpha, lineLength);
            }
            var afterRendering = performance.now();

            for(var i = 0; i < MipRotationImage.length; i++){
                //this.imageData[ctr][i] = displayedImage[i];
                var intensity = (MipRotationImage[i]*MipRotationImage[i])/300;
                imageDataHekk.data[i*4] = intensity;
                imageDataHekk.data[i*4+1] = intensity;
                imageDataHekk.data[i*4+2] = intensity;
                imageDataHekk.data[i*4+3] = 255;
            }

            ctx.putImageData(imageDataHekk, 0, 0);
            var end = performance.now();
            console.log("MIP time: " + (afterRendering-beforeRendering) + "ms");
            console.log("Total time: " + (end-start) + "ms");
        }
    });


};
