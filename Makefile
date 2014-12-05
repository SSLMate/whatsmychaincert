#
# Copyright (c) 2014 Opsmate, Inc.
#
# See COPYING file for license information.
#

INSTALL = install
INSTALL_WEBASSETS = cp -dR
ENDPOINT = https://whatsmychaincert.com
FILES = index.html index.htmlgz robots.txt
TLSCONFIGGUIDE = ../tlsconfigguide

-include config.mk

export TLSCONFIGGUIDE

all: index.html index.htmlgz

index.html: index.xml helpers/whatsmychaincert.xslt configguide.xml
	xsltproc --stringparam endpoint "$(ENDPOINT)" helpers/whatsmychaincert.xslt index.xml > $@

index.htmlgz: index.html
	gzip -n9 < $< > $@

configguide.xml: helpers/mkconfigguide $(TLSCONFIGGUIDE)/templates.index
	helpers/mkconfigguide > $@

clean:
	rm -f index.html configguide.xml

ifneq ($(DESTDIR),)
install: $(FILES)
	$(INSTALL) -m 755 -d $(DESTDIR)
	$(INSTALL) -m 644 $(FILES) $(DESTDIR)/
	$(INSTALL_WEBASSETS) assets/ $(DESTDIR)/assets
else
install:
	@echo "Please set DESTDIR variable to use 'make install'"
	@false
endif

.PHONY: all clean install
