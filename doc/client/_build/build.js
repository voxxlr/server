const fs = require('fs');
const { execSync } = require('child_process')
const HTMLParser = require('node-html-parser');
const path = require("path");

//process.chdir(path.resolve(__dirname, ".."))
console.log("Current directory:", process.cwd());
function minimize(html)
{
	let root = HTMLParser.parse(fs.readFileSync(path.resolve(process.cwd(),html), 'utf8'));

	root.querySelectorAll("script").forEach(node =>
	{
		let src = node.getAttribute("src");
		if (src && src.startsWith("/"))
		{
			let compiled = execSync(`npx google-closure-compiler --js=../${src}`).toString()
			node.textContent = compiled;
			node.removeAttribute("src");
			node.setAttribute("id", src);
		}
	})

	return root.toString();
}


console.log("building /1d/index.min.html");
fs.writeFileSync(path.resolve(process.cwd(), '../1d/index.min.html'), minimize('../1d/index.html'))
console.log("building /2d/index.min.html");
fs.writeFileSync(path.resolve(process.cwd(), '../2d/index.min.html'), minimize('../2d/index.html'))
console.log("building /3d/index.min.html");
fs.writeFileSync(path.resolve(process.cwd(), '../3d/index.min.html'), minimize('../3d/index.html'))
