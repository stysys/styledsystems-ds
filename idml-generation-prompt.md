# InDesign 2026 IDML Generation Specification

You are tasked with generating valid InDesign IDML files (DOMVersion 21.1) that will open without errors in Adobe InDesign 2026.

## Critical Requirements

### 1. ZIP Structure (MUST follow exactly)
- **First file**: `mimetype` — stored uncompressed (ZIP_STORED), containing exactly: `application/vnd.adobe.indesign-idml-package`
- **All other files**: compressed with DEFLATE (ZIP_DEFLATED)

### 2. Required Files (all must exist)
```
mimetype
META-INF/
  ├── container.xml
  └── metadata.xml
designmap.xml
Resources/
  ├── Fonts.xml
  ├── Styles.xml
  ├── Preferences.xml
  └── Graphic.xml
MasterSpreads/
  └── MasterSpread_ud8.xml
Spreads/
  └── Spread_ud1.xml
Stories/
  └── Story_ub1.xml
XML/
  ├── BackingStory.xml
  └── Tags.xml
```

### 3. XML Declaration and Processing Instruction Order (CRITICAL)
**designmap.xml MUST have this exact structure:**
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="21.1(56)" ?>
<Document ...>
```
Order is: XML declaration FIRST, then AID processing instruction, then Document element.

### 4. DOMVersion (EVERYWHERE)
Every single XML file must declare: `DOMVersion="21.1"`

### 5. designmap.xml Structure (minimum required)
```xml
<Document xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" 
  DOMVersion="21.1" Self="d" StoryList="ub1" Name="Untitled-1" 
  ZeroPoint="0 0" ActiveLayer="uce">
  <idPkg:Graphic src="Resources/Graphic.xml" />
  <idPkg:Fonts src="Resources/Fonts.xml" />
  <idPkg:Styles src="Resources/Styles.xml" />
  <idPkg:Preferences src="Resources/Preferences.xml" />
  <Layer Self="uce" Name="Layer 1" Visible="true" Locked="false" 
    IgnoreWrap="false" ShowGuides="true" LockGuides="false" 
    UI="true" Expendable="true" Printable="true">
    <Properties>
      <LayerColor type="enumeration">LightBlue</LayerColor>
    </Properties>
  </Layer>
  <idPkg:MasterSpread src="MasterSpreads/MasterSpread_ud8.xml" />
  <idPkg:Spread src="Spreads/Spread_ud1.xml" />
  <Section Self="ud7" Length="1" Name="" ContinueNumbering="true" 
    IncludeSectionPrefix="false" Marker="" PageStart="ud6" SectionPrefix="" 
    AlternateLayoutLength="1" AlternateLayout="A4 V">
    <Properties>
      <PageNumberStyle type="enumeration">Arabic</PageNumberStyle>
    </Properties>
  </Section>
  <idPkg:BackingStory src="XML/BackingStory.xml" />
</Document>
```

### 6. Styles.xml (minimum required)
```xml
<idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" 
  DOMVersion="21.1">
  <RootParagraphStyleGroup Self="RootParagraphStyleGroup">
    <ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" 
      Name="$ID/[No paragraph style]"/>
    <ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" 
      Name="$ID/NormalParagraphStyle"/>
    <!-- Add your custom paragraph styles here -->
  </RootParagraphStyleGroup>
  <RootCharacterStyleGroup Self="RootCharacterStyleGroup">
    <CharacterStyle Self="CharacterStyle/$ID/[No character style]" 
      Name="[No character style]"/>
  </RootCharacterStyleGroup>
  <RootObjectStyleGroup Self="RootObjectStyleGroup">
    <ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]"/>
    <ObjectStyle Self="ObjectStyle/$ID/[Normal Graphics Frame]" 
      Name="$ID/[Normal Graphics Frame]"/>
    <ObjectStyle Self="ObjectStyle/$ID/[Normal Text Frame]" 
      Name="$ID/[Normal Text Frame]"/>
  </RootObjectStyleGroup>
  <RootTableStyleGroup Self="RootTableStyleGroup">
    <TableStyle Self="TableStyle/$ID/[None]" Name="$ID/[None]"/>
  </RootTableStyleGroup>
  <RootCellStyleGroup Self="RootCellStyleGroup">
    <CellStyle Self="CellStyle/$ID/[None]" Name="$ID/[None]"/>
  </RootCellStyleGroup>
</idPkg:Styles>
```

### 7. MasterSpread Page Requirements
```xml
<Page Self="ubd" MasterPageTransform="1 0 0 1 0 0" Name="1" 
  AppliedMaster="$ID/[None]" PageColor="Nothing" GridStartingPoint="TopOutside" 
  UseMasterGrid="true" OverrideList="" TabOrder="">
  <Properties>
    <Descriptor type="list">
      <ListItem type="string"></ListItem>
    </Descriptor>
  </Properties>
  <MarginPreference ColumnCount="1" ColumnGutter="12" Top="36" 
    Bottom="36" Left="36" Right="36"/>
</Page>
```

### 8. Spread Page Requirements (CRITICAL DIFFERENCES)
```xml
<Page Self="ud6" AppliedMaster="ud8" MasterPageTransform="1 0 0 1 0 0" 
  Name="1" GeometricBounds="0 0 841.889763778 595.2755905509999" 
  ItemTransform="1 0 0 1 0 0">
  <Properties>
    <Descriptor type="list">
      <ListItem type="string"></ListItem>
    </Descriptor>
  </Properties>
  <MarginPreference ColumnCount="1" ColumnGutter="12" Top="36" 
    Bottom="36" Left="36" Right="36"/>
</Page>
```
**Must include: GeometricBounds and ItemTransform attributes**

### 9. Font Definitions (if using custom fonts)
In Fonts.xml:
```xml
<FontFamily Self="FontNameFamily" Name="FontName">
  <Font Self="FontName Regular" Name="Regular" FontStyle="Regular" 
    PostScriptName="FontName"/>
  <Font Self="FontName Bold" Name="Bold" FontStyle="Bold" 
    PostScriptName="FontName-Bold"/>
</FontFamily>
```
**Valid FontStyle values only**: Regular, Bold, Italic, BoldItalic

### 10. Paragraph Style Definition (example)
```xml
<ParagraphStyle Self="ParagraphStyleGroup/StyleGroup/style-name" 
  Name="Style Name" PointSize="12" Leading="14.4" Tracking="0" 
  AppliedFont="FontName" FontStyle="Regular"/>
```
- `AppliedFont` must match a declared font family in Fonts.xml OR be system font
- `FontStyle` must be one of: Regular, Bold, Italic, BoldItalic

### 11. Container.xml (standard)
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="designmap.xml" />
  </rootfiles>
</container>
```

### 12. Preferences.xml (page dimensions)
For A4:
```xml
<DocumentPreference PageHeight="841.889763778" PageWidth="595.2755905509999" 
  PagesPerDocument="1"/>
```
Use these exact values for A4 or convert US Letter (612x792 points).

### 13. Empty Files (valid minimal content)
- **Fonts.xml** (if no custom fonts): just empty `<idPkg:Fonts ...></idPkg:Fonts>`
- **Graphic.xml**: just empty `<idPkg:Graphic ...></idPkg:Graphic>`
- **BackingStory.xml**: `<idPkg:BackingStory ...><BackingStory/></idPkg:BackingStory>`
- **Tags.xml**: just empty `<Tags ...></Tags>`

---

## Implementation Checklist
- [ ] ZIP created with mimetype as first file (uncompressed)
- [ ] All other files compressed with DEFLATE
- [ ] designmap.xml has XML declaration THEN AID PI (correct order)
- [ ] All XML files declare DOMVersion="21.1"
- [ ] designmap.xml includes Layer, Section, BackingStory references
- [ ] MasterSpread has MarginPreference on Page element
- [ ] Spread Page has GeometricBounds and ItemTransform attributes
- [ ] All style groups exist in Styles.xml (Paragraph, Character, Object, Table, Cell)
- [ ] Fonts.xml fonts are properly declared if used in Styles
- [ ] Story references match designmap StoryList attribute (ub1)

---

## Example: Typography System Integration
When adding Styled Systems typography to designmap:
1. Define all scale sizes in Fonts.xml
2. Create Scale/* paragraph styles in Styles.xml
3. Create Semantic/* paragraph styles that reference Scale/* via `BasedOn` attribute
4. Store in separate style groups for organization

**Scale Style Example:**
```xml
<ParagraphStyleGroup Self="ParagraphStyleGroup/Scale" Name="Scale">
  <ParagraphStyle Self="ParagraphStyleGroup/Scale/xs" Name="xs" 
    PointSize="10.24" Leading="14.34" AppliedFont="YourFont" FontStyle="Regular"/>
</ParagraphStyleGroup>
```

**Semantic Style Example:**
```xml
<ParagraphStyleGroup Self="ParagraphStyleGroup/Semantic" Name="Semantic">
  <ParagraphStyle Self="ParagraphStyleGroup/Semantic/display" Name="Display" 
    BasedOn="ParagraphStyleGroup/Scale/5xl"/>
</ParagraphStyleGroup>
```

---

## Validation
Test the generated IDML:
1. Open in Adobe InDesign 2026
2. No import errors should appear
3. All styles should be accessible in the Styles panel
4. Page geometry should match Preferences.xml dimensions

If InDesign rejects the file, verify:
- ZIP structure (mimetype first, uncompressed)
- DOMVersion consistency (all files = 21.1)
- XML well-formedness (no unclosed tags)
- Required elements present (Layer, Section, MarginPreference, GeometricBounds)
