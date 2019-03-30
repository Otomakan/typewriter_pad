document.addEventListener("DOMContentLoaded", (event) => { 
  
  const keypressAudio = new makeMultiAudio('http://www.typewritesomething.com/inc/keypress.mp3')
	const newlineAudio = new Audio('http://www.typewritesomething.com/inc/return.mp3')
	
	dragElement(document.getElementById("note-pad"));
	document.getElementById('text-box').onkeypress = (e)=>{
	    // document.getElementById('audio').play()
	    	if (e.which == 13) {
				newlineAudio.play();
			}
			else{
	    		keypressAudio.play()
			}

	}

})

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "-header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "-header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV: 
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
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