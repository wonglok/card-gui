// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

reader.on('card', async card => {

	console.log();
	console.log(`card detected`, card);

	// example reading 12 bytes assuming containing text in utf8
	try {

		// reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
		const data = await reader.read(4, 12); // starts reading in block 4, continues to 5 and 6 in order to read 12 bytes
		console.log(`data read`, data);
		const payload = data.toString(); // utf8 is default encoding
		console.log(`data converted`, payload);

	} catch (err) {
		console.error(`error when reading data`, err);
	}


});

