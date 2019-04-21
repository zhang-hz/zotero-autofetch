all: builddir
ifdef VERSION
	awk '/em:version=/ { $$0="      em:version=\"${VERSION}\""} { print }' install.rdf > install.rdf.temp && mv install.rdf.temp install.rdf
	zip -r builds/zotero-autofetch-${VERSION}.xpi chrome/* chrome.manifest install.rdf
else
	$(error VERSION variable not defined. Please define it.)
endif

builddir:
	mkdir -p builds

clean:
	rm -f builds/*
