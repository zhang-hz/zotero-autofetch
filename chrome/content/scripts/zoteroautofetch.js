Zotero.AutoFetch = {
	timeinterval: function () {
		// Set default if not set.
		if (Zotero.Prefs.get('zoteroautofetch.timeinterval') === undefined) {
			Zotero.Prefs.set('zoteroautofetch.timeinterval', "1000")
		}
		return Zotero.Prefs.get('zoteroautofetch.timeinterval')
	},
	UA: function () {
		// Set default if not set.
		if (Zotero.Prefs.get('zoteroautofetch.ua') === undefined) {
			Zotero.Prefs.set('zoteroautofetch.ua', "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36")
		}
		return Zotero.Prefs.get('zoteroautofetch.ua')
	},
	scihub_url: function () {
		// Set default if not set.
		if (Zotero.Prefs.get('zoteroautofetch.scihub_url') === undefined) {
			Zotero.Prefs.set('zoteroautofetch.scihub_url', 'https://sci-hub.se/')
		}
		return Zotero.Prefs.get('zoteroautofetch.scihub_url')
	},
	googlescholar_url: function () {
		// Set default if not set.
		if (Zotero.Prefs.get('zoteroautofetch.googlescholar_url') === undefined) {
			Zotero.Prefs.set('zoteroautofetch.googlescholar_url', 'https://scholar.google.com/')
		}
		return Zotero.Prefs.get('zoteroautofetch.googlescholar_url')
	},
	automatic_pdf_download: function () {
		// Set default if not set.
		if (Zotero.Prefs.get('zoteroautofetch.automatic_pdf_download') === undefined) {
			Zotero.Prefs.set('zoteroautofetch.automatic_pdf_download', false)
		}
		return Zotero.Prefs.get('zoteroautofetch.automatic_pdf_download')
	},
	paperType: "google",
	init: function () {
		Zotero.AutoFetch.resetState();
		Zotero.AutoFetch.scihub_url();
		Zotero.AutoFetch.googlescholar_url();
		Zotero.AutoFetch.automatic_pdf_download();

		// Register the callback in Zotero as an item observer
		var notifierID = Zotero.Notifier.registerObserver(
			Zotero.AutoFetch.notifierCallback, ['item']);

		// Unregister callback when the window closes (important to avoid a memory leak)
		window.addEventListener('unload', function (e) {
			Zotero.Notifier.unregisterObserver(notifierID);
		}, false);
	},
	notifierCallback: {
		// Adds pdfs when new item is added to zotero.
		notify: function (event, type, ids, extraData) {
			automatic_pdf_download_bool = Zotero.Prefs.get('zoteroautofetch.automatic_pdf_download');
			if (event == "add" && !(automatic_pdf_download_bool === undefined) && automatic_pdf_download_bool == true) {
				suppress_warnings = true;
				Zotero.AutoFetch.updateItems(Zotero.Items.get(ids), suppress_warnings);
			}
		}
	},
	resetState: function () {
		// Reset state for updating items.
		Zotero.AutoFetch.current = -1;
		Zotero.AutoFetch.toUpdate = 0;
		Zotero.AutoFetch.itemsToUpdate = null;
		Zotero.AutoFetch.numberOfUpdatedItems = 0;
		Zotero.AutoFetch.numberOfSucceedItems = 0;
	},
	updateSucccess:function(){
		Zotero.AutoFetch.numberOfSucceedItems++;
	},
	updateSelectedEntity: function (libraryId,type) {
		Zotero.debug('Updating items from ' + type + 'in entity')
		Zotero.AutoFetch.paperType = type;
		if (!ZoteroPane.canEdit()) {
			ZoteroPane.displayCannotEditLibraryMessage();
			return;
		}

		var collection = ZoteroPane.getSelectedCollection(false);

		if (collection) {
			Zotero.debug("Updating items in entity: Is a collection == true")
			var items = [];
			collection.getChildItems(false, false).forEach(function (item) {
				items.push(item);
			});
			suppress_warnings = true;
			Zotero.AutoFetch.updateItems(items, suppress_warnings);
		}
	},
	updateSelectedItems: function (type) {
		Zotero.debug('Updating Selected items from ' + type);
		Zotero.AutoFetch.paperType = type;
		suppress_warnings = false;
		Zotero.AutoFetch.updateItems(ZoteroPane.getSelectedItems(), suppress_warnings);
	},
	updateAll: function () {
		Zotero.debug('Updating all items in Zotero')
		var items = [];
		Zotero.AutoFetch.paperType = "google";
		// Get all items
		Zotero.Items.getAll()
			.then(function (items) {
				// Once we have all items, make sure it's a regular item.
				// And that the library is editable
				// Then add that item to our list.
				items.map(function (item) {
					if (item.isRegularItem() && !item.isCollection()) {
						var libraryId = item.getField('libraryID');
						if (libraryId == null ||
							libraryId == '' ||
							Zotero.Libraries.isEditable(libraryId)) {
							items.push(item);
						}
					}
				});
			});

		// Update all of our items with pdfs.
		suppress_warnings = true;
		Zotero.AutoFetch.updateItems(items, suppress_warnings);
	},
	updateItems: function (items, suppress_warnings) {
		// If we don't have any items to update, just return.
		if (items.length == 0 ||
			Zotero.AutoFetch.numberOfUpdatedItems < Zotero.AutoFetch.toUpdate) {
			return;
		}

		// Reset our state and figure out how many items we have to update.
		Zotero.AutoFetch.resetState();
		Zotero.AutoFetch.toUpdate = items.length;
		Zotero.AutoFetch.itemsToUpdate = items;
		// Iterate through our items, updating each one with a pdf.
		Zotero.AutoFetch.updateNextItem(suppress_warnings);
	},
	updateNextItem: function (suppress_warnings) {
		Zotero.AutoFetch.numberOfUpdatedItems++;
		var timeInterval = parseInt(Zotero.Prefs.get('zoteroautofetch.timeinterval'));

		if (Zotero.Debug.enabled) Zotero.debug("[auto-fetch] TimeInterval " + timeInterval); 
		// If we have updated all of our items, reset our state and return.
		if (Zotero.AutoFetch.current == Zotero.AutoFetch.toUpdate - 1) {
			var numberofitems = Zotero.AutoFetch.numberOfUpdatedItems - 1;
			alert("[Auto Fetch] All items have been searched. " + Zotero.AutoFetch.numberOfSucceedItems + "/" + numberofitems + " items succeed")
			Zotero.AutoFetch.resetState();
			
			return;
		}
		
		// Update a single item with a pdf.
		Zotero.AutoFetch.current++;
		var type = Zotero.AutoFetch.paperType
		if(type === "google"){
			setTimeout(function(){
				this.Zotero.AutoFetch.updateGooItem(
					this.Zotero.AutoFetch.itemsToUpdate[Zotero.AutoFetch.current]
				);
			},timeInterval)
			
		} else if(type === "scihub"){
			setTimeout(function(){
				this.Zotero.AutoFetch.updateSciItem(
					this.Zotero.AutoFetch.itemsToUpdate[Zotero.AutoFetch.current]
				);
			},timeInterval)
		} else {
			setTimeout(function(){
				this.Zotero.AutoFetch.updateItem(
					this.Zotero.AutoFetch.itemsToUpdate[Zotero.AutoFetch.current]
				);
			},timeInterval)
		}
		
	},
	generateItemSciUrl: function (item) {
		var baseURL = Zotero.Prefs.get('zoteroautofetch.scihub_url')
		var DOI = item.getField('DOI');
		var url = "";
		if (DOI && (typeof DOI == 'string') && DOI.length > 0) {
			url = baseURL + '/' + DOI;
		}

		// If not using sci-hub.tw ssl is disabled due to invalid certs.
		if (!baseURL.includes("sci-hub.se")) {
			url = url.replace('https', 'http')
		}

		return url;
	},
	generateItemGooUrl: function (item) {
		var baseUrl = Zotero.Prefs.get('zoteroautofetch.googlescholar_url');
		var url = baseUrl +
			'scholar?hl=en&as_q=' +
			encodeURIComponent(item.getField('title')).replace(/ /g, '+') +
			'&as_occt=title&num=1';

		var creators = item.getCreators();
		if (creators.length > 0) {
			url += '&as_sauthors=' +
				encodeURIComponent(creators[0].lastName).replace(/ /g, '+');
		} else {
			var date = item.getField('date');
			if (date != '') {
				url += '&as_ylo=' + date + '&as_yhi=' + date;
			}
		}

		return url;
	},
	fixPdfUrl: function (pdf_url) {
		let prepend = "http"
		// Check if user preferred url is using https. If so, prepend/replace https.
		// If not prepend/replace http.
		scihub_url = Zotero.Prefs.get('zoteroautofetch.scihub_url')
		if (scihub_url.includes("sci-hub.se")) {
			prepend = "https"
		}

		// Handle error on Scihub where https/http is not prepended to url
		if (pdf_url.slice(0, 2) == "//") {
			pdf_url = prepend + ":" + pdf_url
		}

		// Make sure all scihub urls use https/http and not http.
		if (pdf_url.slice(0, 5) != "https") {
			pdf_url = prepend + pdf_url.slice(4)
		}

		// If not using sci-hub.tw ssl is disabled due to invalid certs.
		if (!scihub_url.includes("sci-hub.se")) {
			pdf_url = pdf_url.replace('https', 'http')
		}

		return pdf_url;
	},
	getGooglePDFUrl: function (responseText) {
		if (responseText === '' || responseText === undefined) {
			return 'false';
		}
		// 'gs_r gs_or gs_scl' is classes of each item element in search result
		var resultExists = responseText.match('gs_r gs_or gs_scl') ? true : false;
		var pdf_url = "";
		var pdfExists = responseText.match('gs_ggs gs_fl') ? true : false;;
		if (resultExists && pdfExists) {
			t = responseText.match(/http[^\"]+pdf/)
			if(t !== null){
				pdf_url = t[0]
			}
		}

		return pdf_url
	},
	updateItem: function(item, suppress_warnings) {
		s = Zotero.AutoFetch.updateGooItem(item, suppress_warnings);
		if(s === false){
			Zotero.AutoFetch.updateSciItem(item, suppress_warnings);
		}
	},
	updateGooItem: function (item, suppress_warnings) {
		Zotero.debug("Suppress: " + suppress_warnings)
		var goourl = Zotero.AutoFetch.generateItemGooUrl(item);
		var useragent = Zotero.Prefs.get('zoteroautofetch.ua');
		var req = new XMLHttpRequest();
		var success = false;
		req.open('GET', goourl, true);
		req.setRequestHeader("user-agent",useragent);
		if (Zotero.Debug.enabled) Zotero.debug("[auto-fetch] GET " + goourl);
		req.onreadystatechange = function () {
			if (req.readyState == 4) {
				if (req.status == 200 && req.responseText.search("www.google.com/recaptcha/api.js") == -1) {
					if (Zotero.Debug.enabled) Zotero.debug("[auto-fetch] GET " + req.status);
					if (item.isRegularItem() && !item.isCollection()) {
						var gooPdfUrl = "";
						gooPdfUrl = Zotero.AutoFetch.getGooglePDFUrl(req.responseText);
						if (Zotero.Debug.enabled) Zotero.debug("[auto-fetch] PDF " + gooPdfUrl);
						if (gooPdfUrl !== "") {
							// Download PDF and add as attachment.
							var split_url = gooPdfUrl.split('/');
							var fileBaseName = split_url[split_url.length - 1].split('.pdf')[0]
							var import_options = {
								libraryID: item.libraryID,
								url: gooPdfUrl,
								parentItemID: item.id,
								title: item.getField('title'),
								fileBaseName: fileBaseName,
								referrer: '',
								cookieSandbox: null
							};
							Zotero.debug("[auto-fetch] Import Options: " + JSON.stringify(import_options, null, "\t"));
							Zotero.Attachments.importFromURL(import_options)
								.then(function (result) {
									Zotero.debug("[auto-fetch] Import result: " + JSON.stringify(result))
									Zotero.AutoFetch.updateSucccess()
									success = true;
									Zotero.AutoFetch.updateNextItem();
								})
								.catch(function (error) {
									success = false;
									Zotero.AutoFetch.updateNextItem();
								})
						} else {
							success = false;
							Zotero.AutoFetch.updateNextItem();
						}
					}


				} else if (req.status == 200 ||
					req.status == 403 ||
					req.status == 503||
					req.status == 302||
					req.status == 429) {
					alert('Please enter the Captcha on the page that will now open and then re-try updating the citations, or wait a while to get unblocked by Google if the Captcha is not present.');
					req2 = new XMLHttpRequest();
					req2.open('GET', goourl, true);
					req2.setRequestHeader("user-agent",useragent)
					req2.onreadystatechange = function () {
						if (req2.readyState == 4) {
							if (typeof Zotero.openInViewer !== 'undefined') {
								Zotero.openInViewer(goourl);
							} else if (typeof ZoteroStandalone !== 'undefined') {
								ZoteroStandalone.openInViewer(goourl);
							} else if (typeof Zotero.launchURL !== 'undefined') {
								Zotero.launchURL(goourl);
							} else {
								window.gBrowser.loadOneTab(
									goourl, { inBackground: false });
							}
							Zotero.AutoFetch.resetState();
						}
					}
					req2.send(null);
				} else {
					if (Zotero.Debug.enabled) Zotero.debug("[auto-fetch][google] req.status == " + req.status);
					alert("[ERROR][Auto Fetch][Google Schoolar] Request return HTTP " + req.status)
				}
			}
		};
		req.send(null);
		return success
	},
	updateSciItem: function (item, suppress_warnings) {
		var sciurl2 = Zotero.AutoFetch.generateItemSciUrl(item);
		var pdf_url = "";
		var useragent = Zotero.Prefs.get('zoteroautofetch.ua');
		var req = new XMLHttpRequest();
		var sciurl = sciurl2.replace(".tw", ".se");
		
		Zotero.debug('[auto-fetch] Opening ' + sciurl);
		if (sciurl != "") {
			req.open('GET', sciurl, true);
			req.setRequestHeader("user-agent",useragent);
			if (Zotero.Debug.enabled) Zotero.debug("[auto-fetch] GET " + sciurl);
			req.onreadystatechange = function () {
				if (req.readyState == 4) {
					if (req.status == 200 && req.responseText.search("captcha") == -1) {
						if (item.isRegularItem() && !item.isCollection()) {
							try {
								// Extract direct pdf url from scihub webpage.
								var split_html = req.responseText.split('<iframe src = "')
								pdf_url = split_html[1].split('"')[0]
								pdf_url = Zotero.AutoFetch.fixPdfUrl(pdf_url);

								// Extract PDF name.
								var split_url = pdf_url.split('/');
								var fileBaseName = split_url[split_url.length - 1].split('.pdf')[0]
							} catch (e) {
								Zotero.debug("[auto-fetch] Error parsing webpage 1" + e)
								alert("[ERROR][Auto Fetch][Google Schoolar] Error parsing webpage 1" + e)
							}

							try {
								// Download PDF and add as attachment.
								var import_options = {
									libraryID: item.libraryID,
									url: pdf_url,
									parentItemID: item.id,
									title: item.getField('title'),
									fileBaseName: fileBaseName,
									referrer: '',
									cookieSandbox: null
								};
								Zotero.debug("[auto-fetch] Import Options: " + JSON.stringify(import_options, null, "\t"));
								Zotero.Attachments.importFromURL(import_options)
									.then(function (result) {
										Zotero.debug("[auto-fetch] Import result: " + JSON.stringify(result))
										Zotero.AutoFetch.updateSucccess();
										Zotero.AutoFetch.updateNextItem();
									})
									.catch(function (error) {
										Zotero.debug("[auto-fetch] Import error: " + error)
										// See the following code, if Scihub throws a captcha then our import will throw this error.
										// https://github.com/zotero/zotero/blob/26056c87f1d0b31dc56981adaabcab8fc2f85294/chrome/content/zotero/xpcom/attachments.js#L863
										// If a PDF link shows a captcha, pop up a new browser window to enter the captcha.
										Zotero.debug("[auto-fetch] Scihub is asking for captcha for: " + pdf_url);
										alert('Please enter the Captcha on the page that will now open and then re-try updating the PDFs, or wait a while to get unblocked by Scihub if the Captcha is not present.');
										req2 = new XMLHttpRequest();
										req2.open('GET', pdf_url, true);
										req2.setRequestHeader("user-agent",useragent);
										req2.onreadystatechange = function () {
											if (req2.readyState == 4) {
												if (typeof Zotero.openInViewer !== 'undefined') {
													Zotero.openInViewer(pdf_url);
												} else if (typeof ZoteroStandalone !== 'undefined') {
													ZoteroStandalone.openInViewer(pdf_url);
												} else if (typeof Zotero.launchURL !== 'undefined') {
													Zotero.launchURL(pdf_url);
												} else {
													window.gBrowser.loadOneTab(pdf_url, { inBackground: false });
												}
												Zotero.AutoFetch.resetState();
											}
										}
										req2.send(null);
									});
							} catch (e) {
								Zotero.debug("[auto-fetch] Error creating attachment: " + e)
								alert("[ERROR][Auto Fetch][Scihub] Error creating attachment: " + e)
							}
						}
					} else if (req.status == 200 || req.status == 403 || req.status == 503) {
						// If too many requests were made.. pop up a new browser window to
						// allow user to enter in captcha for scihub.
						Zotero.debug('[auto-fetch] Scihub is asking for captcha for: ' + sciurl);
						alert(Zotero.AutoFetch.captchaString);
						req2 = new XMLHttpRequest();
						req2.open('GET', sciurl, true);
						req2.onreadystatechange = function () {
							if (req2.readyState == 4) {
								if (typeof Zotero.openInViewer !== 'undefined') {
									Zotero.openInViewer(pdf_url);
								} else if (typeof ZoteroStandalone !== 'undefined') {
									ZoteroStandalone.openInViewer(pdf_url);
								} else if (typeof Zotero.launchURL !== 'undefined') {
									Zotero.launchURL(pdf_url);
								} else {
									window.gBrowser.loadOneTab(pdf_url, { inBackground: false });
								}
								Zotero.AutoFetch.resetState();
							}
						}
						req2.send(null);
					} else {
						if (Zotero.Debug.enabled) Zotero.debug("[auto-fetch]Scihub req.status == " + req.status);
						alert("[ERROR][Auto Fetch][Scihub] Request return HTTP " + req.status)
					}

				}
			};
			req.send(null);
		} else if (!(suppress_warnings === undefined) && suppress_warnings == false) {
			alert("To be able to fetch a PDF your library item must currently have a DOI")
		}

	}
};

window.addEventListener('load', function (e) {
	Zotero.AutoFetch.init();
}, false);
