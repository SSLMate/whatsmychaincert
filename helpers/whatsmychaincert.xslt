<xsl:stylesheet version="1.0"
	exclude-result-prefixes="whatsmychaincert xhtml"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:xhtml="http://www.w3.org/1999/xhtml"
	xmlns:whatsmychaincert="http://xmlns.sslmate.com/whatsmychaincert"
	xmlns="http://www.w3.org/1999/xhtml">

	<xsl:output
		method="xml"
		encoding="UTF-8"
		indent="no"
		doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN"
		doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"
		media-type="application/xhtml+xml"
		omit-xml-declaration="yes" />

	<xsl:param name="endpoint"/>

	<xsl:template match="comment()" priority="20"/>
	<xsl:template match="whatsmychaincert:configguide" priority="20">
		<xsl:apply-templates select="document('configguide.xml', /)"/>
	</xsl:template>
	<xsl:template match="whatsmychaincert:endpoint" priority="20">
		<xsl:value-of select="$endpoint"/>
	</xsl:template>
	<xsl:template match="xhtml:form/@whatsmychaincert:action" priority="20">
		<xsl:attribute name="action"><xsl:value-of select="concat($endpoint, '/', .)"/></xsl:attribute>
	</xsl:template>
	<xsl:template match="@*|node()">
		<xsl:copy>
			<xsl:apply-templates select="@*|node()"/>
		</xsl:copy>
	</xsl:template>
	<xsl:template match="/" priority="20">
		<xsl:apply-templates select="*"/>
	</xsl:template>
</xsl:stylesheet>
