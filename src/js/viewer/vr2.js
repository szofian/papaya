/*** Imports ***/
var papaya = papaya || {};
papaya.viewer = papaya.viewer || {};



/*** Constructor ***/
papaya.viewer.Vr = papaya.viewer.Vr || function (width, height, screenVols) {
        this.screenVolumes = screenVols;
        this.xDim = width;
        this.yDim = height;
    };

var brightness = 7;
var maxIntensity = 255;

papaya.viewer.Vr.getAlphaValueForVoxel = function (greyScaleColor) {
    var step = 1 / maxIntensity;
    return step * greyScaleColor;
};

papaya.viewer.Vr.getVectorLength = function (vector) {
    return Math.sqrt(vector[0]*vector[0] + vector[1]*vector[1]);
};

papaya.viewer.Vr.getDistanceBetweenTwoPoints = function (firstPoint, secondPoint) {
    var vectorBetweenTwoPoints = [firstPoint[0] - secondPoint[0], firstPoint[1] - secondPoint[1]];
    return papaya.viewer.Vr.getVectorLength(vectorBetweenTwoPoints);
};

papaya.viewer.Vr.getEndPoints = function (directionVector, pointOnLine, width, height, eye){
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
    }else if(papaya.viewer.Vr.getDistanceBetweenTwoPoints(endPoints[0], eye) > papaya.viewer.Vr.getDistanceBetweenTwoPoints(endPoints[1], eye)) {
        endPoints.reverse(); //TODO: examine only once
    }

    return endPoints;
};

papaya.viewer.Vr.renderVr = function(pixels, VrRotationImage, cols, rows, slices, alpha, lineLength){

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
        pointsOnLine[lineLength/2+i+1] = [eye[0]+normNormalVector[0]*(i+1), eye[1]+normNormalVector[1]*(i+1)]; //TODO: adding instead of multiplication
        pointsOnLine[lineLength/2-i-1] = [eye[0]-normNormalVector[0]*(i+1), eye[1]-normNormalVector[1]*(i+1)];
    }

    //   var pointsOnLineLenght = pointsOnLine.length;

    var endPoints = new Array(lineLength);
    var distanceBetweenEndpoints = new Array(lineLength);
    for(var i = 0; i < lineLength; i++) {
        endPoints[i] = papaya.viewer.Vr.getEndPoints(direction, pointsOnLine[i], rows, cols, eye);
        distanceBetweenEndpoints[i] = Math.round(Math.sqrt(Math.pow(endPoints[i][0][0] - endPoints[i][1][0], 2) + Math.pow(endPoints[i][0][1] - endPoints[i][1][1], 2)));
    }

    //calculate the lines that are needed to observed for the maximum value
    for(var oneSlice = 0; oneSlice < slices; oneSlice++){
        for(var i = 0; i < endPoints.length; i++){
            //Calculate initial color for first voxel in ray
            var firstVoxelLoc = [Math.round(endPoints[i][0][0]),Math.round(endPoints[i][0][1])];
            var color = pixels[oneSlice*rows*cols + cols*firstVoxelLoc[0] + firstVoxelLoc[1]];
            var intensity = (color/maxIntensity)*papaya.viewer.Vr.getAlphaValueForVoxel(color);
            for(var j = 1; j < Math.round(distanceBetweenEndpoints[i]); j++){
                var newPointLocation = [Math.round(endPoints[i][0][0]+normDirection[0]*j),Math.round(endPoints[i][0][1]+normDirection[1]*j)]; //TODO:
                var pixelColor = pixels[oneSlice*rows*cols + cols*newPointLocation[0] + newPointLocation[1]]; //TODO: szorz�s el?re kisz�mol
                var pixelIntensity = (pixelColor/maxIntensity)*papaya.viewer.Vr.getAlphaValueForVoxel(pixelColor);
                intensity = intensity*(1-papaya.viewer.Vr.getAlphaValueForVoxel(pixelColor)) + pixelIntensity;
            }

            VrRotationImage[oneSlice*lineLength+i] = intensity;
        }
    }
};

papaya.viewer.Vr.renderVrAsm = Module.cwrap('renderVR', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']);
volBuffer = 0;
vrBuffer = 0;

papaya.viewer.Vr.updateVr = function(initialAngle, vrSlice) {
    var cols = vrSlice.screenVolumes[0].volume.header.imageDimensions.cols;
    var rows = vrSlice.screenVolumes[0].volume.header.imageDimensions.rows;
    var slices = vrSlice.screenVolumes[0].volume.header.imageDimensions.slices;
    var pixels = vrSlice.screenVolumes[0].volume.imageData.data;
    console.log("Rows: " + rows + ", Cols: " + cols + ", Slices: " + slices);

    var alpha = initialAngle;
    var diagonal = Math.round(Math.sqrt(rows*rows + cols*cols));
    var lineLength =  Math.round(diagonal*1.2); //TODO: is this the optimal?

    var c = document.getElementById("myCanvas3");
    c.style.width = lineLength + "px";
    c.style.height = slices + "px";
    var ctx = c.getContext("2d");
    var imageDataHekk = ctx.createImageData(lineLength, slices);

    var VrRotationImage = [];

    if(localStorage.getItem('asmMIP') == 'true'){
        // c++ asm.js version
        console.log("Asm.js rendering enabled");
        volBuffer = Module._malloc(pixels.length*pixels.BYTES_PER_ELEMENT);
        Module.HEAPU8.set(pixels, volBuffer);

        const vrSize = lineLength*slices;
        vrBuffer = Module._malloc(vrSize);
        console.log("volBuffer: "+volBuffer +" vrBuffer: "+vrBuffer);
        papaya.viewer.Vr.renderVrAsm(volBuffer, vrBuffer, cols, rows, slices, alpha, lineLength);
        for(var i = 0; i < vrSize; i++){
            VrRotationImage[i] = Module.HEAPU8[vrBuffer+i];
        }
    }else{
        // javascript version
        papaya.viewer.Vr.renderVr(pixels, VrRotationImage, cols, rows, slices, alpha, lineLength);
    }

    for(var i = 0; i < VrRotationImage.length; i++){
        //this.imageData[ctr][i] = displayedImage[i];
        var intensity = VrRotationImage[i];
        imageDataHekk.data[i*4] = intensity*brightness;
        imageDataHekk.data[i*4+1] = 0;
        imageDataHekk.data[i*4+2] = 0;
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
            var VrRotationImage = [];

            var beforeRendering = performance.now();
            if(localStorage.getItem('asmMIP') == 'true'){
                // c++ asm.js version
                papaya.viewer.Vr.renderVrAsm(volBuffer, vrBuffer, cols, rows, slices, alpha, lineLength);
                const vrSize = lineLength*slices;
                for(var i=0; i < vrSize; i++){
                    VrRotationImage[i] = Module.HEAPU8[vrBuffer+i];
                }
                //VrRotationImage = Module.HEAPU8.subarray(vrBuffer, vrSize);
            } else {
                papaya.viewer.Vr.renderVr(pixels, VrRotationImage, cols, rows, slices, alpha, lineLength);
            }
            var afterRendering = performance.now();

            for(var i = 0; i < VrRotationImage.length; i++){
                //this.imageData[ctr][i] = displayedImage[i];
                var intensity = VrRotationImage[i];
                imageDataHekk.data[i*4] = intensity*brightness;
                imageDataHekk.data[i*4+1] = 0;
                imageDataHekk.data[i*4+2] = 0;
                imageDataHekk.data[i*4+3] = 255;
            }

            console.log(imageDataHekk);

            ctx.putImageData(imageDataHekk, 0, 0);
            var end = performance.now();
            console.log("VR time: " + (afterRendering-beforeRendering) + "ms");
            console.log("Total time: " + (end-start) + "ms");
        }
    });


};
