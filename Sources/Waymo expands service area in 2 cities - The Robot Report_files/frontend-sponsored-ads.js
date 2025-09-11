function sponsoredclosePopup(id){
	var elements = document.getElementById(id);
	console.log(elements);
	elements.classList.remove("active");	
}
function sponsoredopenPopup(id){
	var elements = document.getElementById(id);
	console.log(elements);
	sponsoredaddClass(elements,"active");	
}
function sponsoredaddClass(element, classname){
    var currentClassList = (element.className || '').split(/\s+/);
    currentClassList.push(currentClassList.indexOf(classname) > -1 ? '' : classname);
    element.className = currentClassList.join(' ').trim();
}