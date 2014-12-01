ENDPOINT =
FILES = index.html robots.txt

-include config.mk

all: index.html

index.html: index.xml helpers/whatsmychaincert.xslt configguide.xml
	xsltproc --stringparam endpoint "$(ENDPOINT)" helpers/whatsmychaincert.xslt index.xml > $@

configguide.xml: helpers/mkconfigguide
	helpers/mkconfigguide > $@

clean:
	rm -f index.html configguide.xml

ifneq ($(DESTDIR),)
install: $(FILES)
	install -m 755 -d $(DESTDIR)
	install -m 644 $(FILES) $(DESTDIR)/
	install-webassets assets/ $(DESTDIR)/assets
else
install:
	@echo "Please set DESTDIR variable to use 'make install'"
	@false
endif

.PHONY: all clean install
