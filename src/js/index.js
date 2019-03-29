document.addEventListener("DOMContentLoaded", (event) => { 
		/*
 *
 * Inspired by a girl, Ms. Jayme Bergman
 *
 * With help from Ben Wheeler and his online typewriter simulator: 
 *      http://uniqcode.com/typewriter/
 *
 */

var ptrn = (function() {
				var cnv = document.createElement('canvas'),
						ctx = cnv.getContext('2d');
				cnv.width = 500;
				cnv.height = 500;
				for (var x = 0; x < cnv.width; x++) {
						for (var y = 0; y < cnv.width; y++) {
								var fill = randInt(240, 255),
										blend = randInt(240, 255);
								ctx.fillStyle = "rgb(" + fill + "," + fill + "," + fill + ")";
								ctx.fillRect(x, y, 2, 2);
								ctx.fillStyle = "rgba(" + blend + "," + blend + "," + blend + ", .5)";
								ctx.fillRect(x, y, 15, 10);
						}
				}
				return cnv;
		})(),
		paperCanvas = document.getElementById('paper'),
		paper = paperCanvas.getContext('2d'),
		textCanvas = document.getElementById('text-canvas'),
		textCtx = textCanvas.getContext('2d'),
		cursorCanvas = document.getElementById('cursor-canvas'),
		cursorCtx = cursorCanvas.getContext('2d'),
		cursorInput = document.getElementById('cursor-input'),
		canvases = [paperCanvas, textCanvas, cursorCanvas],
		docElem = document.documentElement,
		keypress_audio = new makeMultiAudio('http://www.typewritesomething.com/inc/keypress.mp3'),
		newline_audio = new Audio('http://www.typewritesomething.com/inc/return.mp3'),
		requestAnimFrame = (function() {
				return window.requestAnimationFrame ||
						window.webkitRequestAnimationFrame ||
						window.mozRequestAnimationFrame ||
						function(callback) {
								window.setTimeout(callback, 1000 / 60);
						};
		})();

// constants !
var IS_IOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/g),
		IS_TOUCH = ('ontouchstart' in docElem),
		CLICK_EVENT = IS_TOUCH ? 'touchstart' : 'click',
		DEVICE_PIXEL_RATIO = window.devicePixelRatio,
		PADDINGMIN = 10,
		PADDINGMAX = 100,
		ALPHA_MAX = .8,
		ALPHA_MIN = .7,
		ALPHA_DECREMENT = 0.001,
		ALPHA_VARIANCE = 0.05,
		LETTER_JITTER = 0.1,
		LETTER_ROTATE = 0.02,
		TEXT_COLOR = 'rgb(50,40,40)',
		CURSOR_COLOR = 'rgba(175,0,0,0.5)',
		NAV_BUTTONS = {
				8: 'moveleft',
				37: 'moveleft',
				38: 'moveup',
				39: 'moveright',
				40: 'movedown',
				13: 'newline',
		},
		NO_AUDIO = {
				8: 'moveleft',
				9: 'TAB',
				16: 'SHIFT',
				17: 'CTRL',
				18: 'ALT',
				20: 'CAPSLOCK',
				32: 'SPACE',
				37: 'moveleft',
				38: 'moveup',
				39: 'moveright',
				40: 'movedown'
		};

// variables
var canvasWidth,
		canvasHeight = docElem.clientHeight,
		chars = [],
		paddingx,
		paddingy,
		posx,
		posy,
		letter_width,
		letter_height,
		letter_size,
		cursorposx,
		cursorposy,
		alpha,
		is_focused,
		jittered_char_pos = {},
		rotated_char_pos = {},
		char_opacity = {};

drawText();
window.onresize = drawText;

if (!IS_IOS) {
		focus();
}

// event handlers

function focus() {
		is_focused = true;
		updateCursor();
		cursorInput.value = ' ';
		if (IS_IOS) {
				cursorInput.focus();
		} else {
				setTimeout(function() {
						cursorInput.focus();
				}, 150);
		}
}

function blur() {
		is_focused = false;
		removeCursor();
		cursorInput.blur();
}

document.addEventListener('click', function(e) {
		if (is_focused) {
				blur();
		} else {
				posx = e.offsetX;
				posy = e.offsetY;
				focus();
		}
});

document.addEventListener('touchstart', function(e) {
		var touch = e.changedTouches[0];
		e.preventDefault();
		if (is_focused) {
				blur();
		} else {
				if (chars.length) {
						posx = touch.clientX;
						posy = touch.clientY;
				}
				focus();
		}
});

cursorInput.addEventListener('keydown', function(e) {
		var no_audio = NO_AUDIO[e.which];

		if (!no_audio) {
				if (e.which == 13) {
						newline_audio.play();
				} else {
						keypress_audio.play();
				}
				return true;
		}

		if (no_audio == 'TAB') {
				/* refocus */
				setTimeout(focus, 10);
		}
});

cursorInput.addEventListener('keyup', function(e) {
		var nav_button = NAV_BUTTONS[e.which],
				value = nav_button || this.value.substr(1);

		if (!value) return;

		// wipe input to handle one character at a time.
		// leave a single space so that mobile isn't forced to upper case
		this.value = ' ';

		if (nav_button) {

				updateCursor(value);

		} else {

				// update multiple characters in case they keydown more than keyup
				for (var i = 0, len = value.length; i < len; i++) {
						var single_char = value[i];

						if (!jittered_char_pos[single_char]) {
								// save general position
								jittered_char_pos[single_char] = randRange(-LETTER_JITTER, LETTER_JITTER);
								rotated_char_pos[single_char] = randRange(-LETTER_ROTATE, LETTER_ROTATE);
								char_opacity[single_char] = randRange(ALPHA_MIN, ALPHA_MAX);
						}

						addToChars(single_char);
						updateCursor('moveright');
				}
		}
});

function drawText() {
		var _chars = chars;

		// resize
		canvasWidth = docElem.clientWidth;

		for (var i = 0, len = canvases.length; i < len; i++) {
				var canvas = canvases[i];
				canvas.width = canvasWidth;
				canvas.height = canvasHeight;

				// make Canvas Retina Proof
				if (DEVICE_PIXEL_RATIO) {
						canvas.width = canvasWidth * DEVICE_PIXEL_RATIO;
						canvas.height = canvasHeight * DEVICE_PIXEL_RATIO;
						canvas.style.width = canvasWidth + 'px';
						canvas.style.height = canvasHeight + 'px';
				}

		}

		// redraw bg
		drawBackground();

		// pad as necessary with size change
		paddingx = Math.max(Math.min((canvasWidth / 2 / 10), PADDINGMAX), PADDINGMIN);
		paddingy = Math.min(paddingx * 2, 100);
		posx = posx || paddingx;
		posy = posy || paddingy;
		cursorposx = cursorposx || posx;
		cursorposy = cursorposy || posy;

		// change letter size as necessary with size change
		letter_width = linearInterpolate(paddingx, [PADDINGMIN, PADDINGMAX], [12, 15]);
		letter_height = letter_width * 20 / 12;
		letter_size = letter_height;

		alpha = ALPHA_MAX;

		// reset contexts, because resizing wipes them
		textCtx.font = letter_size + "px Special Elite, serif";
		textCtx.fillStyle = TEXT_COLOR;
		textCtx.globalAlpha = alpha;
		textCtx.scale(DEVICE_PIXEL_RATIO, DEVICE_PIXEL_RATIO);

		cursorCtx.fillStyle = CURSOR_COLOR;
		cursorCtx.globalAlpha = ALPHA_MAX;
		cursorCtx.scale(DEVICE_PIXEL_RATIO, DEVICE_PIXEL_RATIO);

		// wipe and redraw any characters
		chars = [];
		for (var i = 0, len = _chars.length; i < len; i++) {
				var char = _chars[i];
				updateText(char);
		}
}

function updateCursor(value) {
		if (value === 'moveleft') {
				posx -= letter_width;
		} else if (value === 'moveup') {
				posy -= letter_height;
		} else if (value === 'movedown') {
				posy += letter_height;
		} else if (value === 'moveright') {
				posx += letter_width;
		} else if (value === 'newline') {
				posx = paddingx;
				posy += letter_height;
		}

		drawCursor(posx, posy);
}

function removeCursor() {
		cursorCtx.clearRect(cursorposx, cursorposy, letter_width + 20, letter_height / 10 + 20);
}

function drawCursor(x, y) {
		var diff = y - (canvasHeight - (docElem.clientHeight / 2));
		cursorInput.style.top = (y + 100) + 'px';
		if (diff > 0) {
				canvasHeight += diff;
				drawText();
		}
		removeCursor();

		y += 2;

		cursorCtx.fillRect(x, y, letter_width, letter_height / 10);
		cursorposx = x - 10;
		cursorposy = y - 10;
}

function addToChars(char) {
		var jitter_y = (function() {
						var general_position = jittered_char_pos[char];
						// add more random
						return general_position + randRange(-LETTER_JITTER, LETTER_JITTER);
				})(),
				rotate_xy = (function() {
						var general_position = rotated_char_pos[char];
						// add more random
						return general_position + randRange(-LETTER_ROTATE, LETTER_ROTATE);
				})(),
				opacity = (function() {
						var _opacity = char_opacity[char];
						return _opacity + randRange(-ALPHA_VARIANCE, ALPHA_VARIANCE);
				})();

		alpha -= ALPHA_DECREMENT;

		updateText({
				opacity: opacity,
				value: char,
				rotate_xy: rotate_xy,
				x: posx,
				y: posy + jitter_y
		});
}

function updateText(charobj) {
		var value = charobj.value,
				opacity = charobj.opacity,
				rotate_xy = charobj.rotate_xy,
				x = charobj.x,
				y = charobj.y;

		chars.push(charobj);

		textCtx.save();
		textCtx.translate(x, y);
		textCtx.rotate(rotate_xy);
		textCtx.globalAlpha = opacity;
		textCtx.fillText(value, 0, 0);
		textCtx.restore();
}

function drawBackground() {
		var pattern = paper.createPattern(ptrn, 'repeat');
		paper.fillStyle = pattern;
		paper.fillRect(0, 0, paperCanvas.width, paperCanvas.height);
}

function randRange(min, max) {
		var value = (Math.random() * (max - min)) + min;
		return value;
}

function randInt(min, max) {
		return Math.round(randRange(min, max));
}

function makeMultiAudio(src) {
		var output = [],
				current = 0,
				num = 5;
		for (var i = 0; i < num; i++) {
				output.push(new Audio(src));
		}
		this.play = function() {
				output[current++ % num].play();
		};
}

function linearInterpolate(val, from_range, to_range) {
		var minX = from_range[0],
				minY = to_range[0],
				rangeX = from_range[1] - from_range[0],
				rangeY = to_range[1] - to_range[0];

		return (val - minX) * rangeY / rangeX + minY;
}
})