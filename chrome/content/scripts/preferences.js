	initPreferences = function() {
		timeinterval = Zotero.AutoFetch.timeinterval();
		ua = Zotero.AutoFetch.UA();
		scihub_url = Zotero.AutoFetch.scihub_url();
		googlescholar_url = Zotero.AutoFetch.googlescholar_url();
		automatic_pdf_download_bool = Zotero.AutoFetch.automatic_pdf_download();

		// Apply setting to
		document.getElementById('id-zoteroautofetch-automatic-pdf-download').checked = automatic_pdf_download_bool
		document.getElementById('id-zoteroautofetch-timeinterval').value = timeinterval
		document.getElementById('id-zoteroautofetch-ua').value = ua
		document.getElementById('id-zoteroautofetch-scihub-url').value = scihub_url
		document.getElementById('id-zoteroautofetch-googlescholar-url').value = googlescholar_url
	}
