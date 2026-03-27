/**
 * idml.ts — InDesign Markup Language (.idml) exporter
 *
 * Generates the XML file tree for an IDML package (DOMVersion 21.1 / InDesign 2026)
 * containing color swatches and paragraph styles from the design system.
 *
 * Returns a Map<filepath, content> — caller zips it with mimetype first, uncompressed.
 *
 * Spec: idml-generation-prompt.md
 */

import { RAMP_STEPS, type ColorRamp } from "../tokens/colorRamps.js";
import { type ResolvedScaleEntry } from "../tokens/scaleDefinition.js";

// ---------------------------------------------------------------------------
// Public input types
// ---------------------------------------------------------------------------

export interface IdmlColorGroup {
  name: string;
  swatches: Array<{ name: string; hex: string }>;
}

export interface IdmlOptions {
  dsName: string;
  typographyStyles: ResolvedScaleEntry[];
  colorGroups: IdmlColorGroup[];
  /** Optional version string shown in the canvas header frame, e.g. "Mar 27 2026" */
  version?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function xmlAttr(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hexToRgb255(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Map any weight string to the 4 valid IDML FontStyle values */
function toIdmlFontStyle(weight: string): string {
  const w = weight.toLowerCase();
  if (w.includes("bolditalic") || (w.includes("bold") && w.includes("italic"))) return "BoldItalic";
  if (w.includes("italic")) return "Italic";
  if (w.includes("bold") || w.includes("heavy") || w.includes("black") || w.includes("extra")) return "Bold";
  return "Regular";
}

const DOM = "21.1";

// ---------------------------------------------------------------------------
// XML generators
// ---------------------------------------------------------------------------

const METADATA_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/vnd.adobe.indesign-idml-package</dc:format>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="designmap.xml" />
  </rootfiles>
</container>`;

function designmapXml(dsName: string): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="${DOM}(56)" ?>`,
    `<Document xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"`,
    `  DOMVersion="${DOM}" Self="d" StoryList="ub1" Name="${xmlAttr(dsName)}"`,
    `  ZeroPoint="0 0" ActiveLayer="uce">`,
    `  <idPkg:Graphic src="Resources/Graphic.xml" />`,
    `  <idPkg:Fonts src="Resources/Fonts.xml" />`,
    `  <idPkg:Styles src="Resources/Styles.xml" />`,
    `  <idPkg:Preferences src="Resources/Preferences.xml" />`,
    `  <Layer Self="uce" Name="Layer 1" Visible="true" Locked="false"`,
    `    IgnoreWrap="false" ShowGuides="true" LockGuides="false"`,
    `    UI="true" Expendable="true" Printable="true">`,
    `    <Properties>`,
    `      <LayerColor type="enumeration">LightBlue</LayerColor>`,
    `    </Properties>`,
    `  </Layer>`,
    `  <idPkg:MasterSpread src="MasterSpreads/MasterSpread_ud8.xml" />`,
    `  <idPkg:Spread src="Spreads/Spread_ud1.xml" />`,
    `  <idPkg:Story src="Stories/Story_ub1.xml" />`,
    `  <Section Self="ud7" Length="1" Name="" ContinueNumbering="true"`,
    `    IncludeSectionPrefix="false" Marker="" PageStart="ud6" SectionPrefix=""`,
    `    AlternateLayoutLength="1" AlternateLayout="A4 V">`,
    `    <Properties>`,
    `      <PageNumberStyle type="enumeration">Arabic</PageNumberStyle>`,
    `    </Properties>`,
    `  </Section>`,
    `  <idPkg:BackingStory src="XML/BackingStory.xml" />`,
    `</Document>`,
  ].join("\n");
}

function fontsXml(fontFamilies: string[]): string {
  const unique = [...new Set(fontFamilies)];
  const families = unique.map((name) => [
    `  <FontFamily Self="${xmlAttr(name)}Family" Name="${xmlAttr(name)}">`,
    `    <Font Self="${xmlAttr(name)}Regular" Name="Regular" FontStyle="Regular" PostScriptName="${xmlAttr(name.replace(/\s/g, ""))}" />`,
    `    <Font Self="${xmlAttr(name)}Bold" Name="Bold" FontStyle="Bold" PostScriptName="${xmlAttr(name.replace(/\s/g, ""))}-Bold" />`,
    `    <Font Self="${xmlAttr(name)}Italic" Name="Italic" FontStyle="Italic" PostScriptName="${xmlAttr(name.replace(/\s/g, ""))}-Italic" />`,
    `    <Font Self="${xmlAttr(name)}BoldItalic" Name="BoldItalic" FontStyle="BoldItalic" PostScriptName="${xmlAttr(name.replace(/\s/g, ""))}-BoldItalic" />`,
    `  </FontFamily>`,
  ].join("\n")).join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="${DOM}">`,
    families,
    `</idPkg:Fonts>`,
  ].join("\n");
}

function stylesXml(dsName: string, styles: ResolvedScaleEntry[]): string {
  // Scale group: one style per unique sizeToken.
  // Self uses URL-encoded colon (%3a) so InDesign resolves it correctly.
  // BasedOn and AppliedFont must be child <Properties> elements with a type
  // attribute — using them as XML attributes silently fails in InDesign import.
  const seenTokens = new Set<string>();
  const scaleStyles = styles
    .filter((s) => {
      if (seenTokens.has(s.sizeToken)) return false;
      seenTokens.add(s.sizeToken);
      return true;
    })
    .map((s) => [
      `      <ParagraphStyle Self="ParagraphStyle/Scale%3a${xmlAttr(s.sizeToken)}"`,
      `        Name="Scale:${xmlAttr(s.sizeToken)}" PointSize="${s.pointSize}"`,
      `        Leading="${s.leadingPt}" Tracking="${s.tracking}"`,
      `        FontStyle="${toIdmlFontStyle(s.weight)}">`,
      `        <Properties>`,
      `          <BasedOn type="string">$ID/[No paragraph style]</BasedOn>`,
      `          <AppliedFont type="string">${xmlAttr(s.fontFamily)}</AppliedFont>`,
      `        </Properties>`,
      `      </ParagraphStyle>`,
    ].join("\n")).join("\n");

  // Semantic group: BasedOn references Scale via type="object" — this is the
  // correct IDML format for cross-style inheritance of custom styles.
  // No type properties here; everything is inherited from the Scale parent.
  const semanticStyles = styles.map((s) => [
    `      <ParagraphStyle Self="ParagraphStyle/${xmlAttr(s.name)}"`,
    `        Name="${xmlAttr(s.label)}">`,
    `        <Properties>`,
    `          <BasedOn type="object">ParagraphStyle/Scale%3a${xmlAttr(s.sizeToken)}</BasedOn>`,
    `        </Properties>`,
    `      </ParagraphStyle>`,
  ].join("\n")).join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="${DOM}">`,
    `  <RootParagraphStyleGroup Self="RootParagraphStyleGroup">`,
    `    <ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]"/>`,
    `    <ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle"/>`,
    `    <ParagraphStyleGroup Self="ParagraphStyleGroup/Scale" Name="Scale">`,
    scaleStyles,
    `    </ParagraphStyleGroup>`,
    `    <ParagraphStyleGroup Self="ParagraphStyleGroup/Semantic" Name="Semantic">`,
    semanticStyles,
    `    </ParagraphStyleGroup>`,
    `  </RootParagraphStyleGroup>`,
    `  <RootCharacterStyleGroup Self="RootCharacterStyleGroup">`,
    `    <CharacterStyle Self="CharacterStyle/$ID/[No character style]" Name="[No character style]"/>`,
    `  </RootCharacterStyleGroup>`,
    `  <RootObjectStyleGroup Self="RootObjectStyleGroup">`,
    `    <ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]"/>`,
    `    <ObjectStyle Self="ObjectStyle/$ID/[Normal Graphics Frame]" Name="$ID/[Normal Graphics Frame]"/>`,
    `    <ObjectStyle Self="ObjectStyle/$ID/[Normal Text Frame]" Name="$ID/[Normal Text Frame]"/>`,
    `  </RootObjectStyleGroup>`,
    `  <RootTableStyleGroup Self="RootTableStyleGroup">`,
    `    <TableStyle Self="TableStyle/$ID/[None]" Name="$ID/[None]"/>`,
    `  </RootTableStyleGroup>`,
    `  <RootCellStyleGroup Self="RootCellStyleGroup">`,
    `    <CellStyle Self="CellStyle/$ID/[None]" Name="$ID/[None]"/>`,
    `  </RootCellStyleGroup>`,
    `</idPkg:Styles>`,
  ].join("\n");
}

function graphicXml(colorGroups: IdmlColorGroup[]): string {
  const inks = [
    `  <Ink Self="Ink/$ID/Process Cyan"    Name="$ID/Process Cyan"    PrintOrder="1" IsProcess="true" IsOpaque="true" NeutralDensity="0.61" TrapOrder="1" />`,
    `  <Ink Self="Ink/$ID/Process Magenta" Name="$ID/Process Magenta" PrintOrder="2" IsProcess="true" IsOpaque="true" NeutralDensity="0.61" TrapOrder="2" />`,
    `  <Ink Self="Ink/$ID/Process Yellow"  Name="$ID/Process Yellow"  PrintOrder="3" IsProcess="true" IsOpaque="true" NeutralDensity="0.61" TrapOrder="3" />`,
    `  <Ink Self="Ink/$ID/Process Black"   Name="$ID/Process Black"   PrintOrder="4" IsProcess="true" IsOpaque="true" NeutralDensity="1"    TrapOrder="4" />`,
  ];
  const systemColors = [
    `  <Color Self="Color/$ID/Paper"        Model="Process"      Space="CMYK" ColorValue="0 0 0 0"         Name="$ID/Paper" />`,
    `  <Color Self="Color/$ID/Black"        Model="Process"      Space="CMYK" ColorValue="0 0 0 100"       Name="$ID/Black" />`,
    `  <Color Self="Color/$ID/Registration" Model="Registration" Space="CMYK" ColorValue="100 100 100 100" Name="$ID/Registration" />`,
  ];

  const customColors = colorGroups.flatMap((group) =>
    group.swatches.map((swatch) => {
      const [r, g, b] = hexToRgb255(swatch.hex);
      return `  <Color Self="Color/${xmlAttr(swatch.name.replace(/[^a-zA-Z0-9_-]/g, "_"))}" Model="Process" Space="RGB" ColorValue="${r} ${g} ${b}" Name="${xmlAttr(swatch.name)}" />`;
    })
  );

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="${DOM}">`,
    ...inks,
    ...systemColors,
    ...customColors,
    `</idPkg:Graphic>`,
  ].join("\n");
}

function preferencesXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="${DOM}">`,
    `  <DocumentPreference PageHeight="841.889763778" PageWidth="595.2755905509999"`,
    `    PagesPerDocument="1" FacingPages="false" AllowPageShuffle="true"`,
    `    DocumentBleedTopOffset="0" DocumentBleedBottomOffset="0"`,
    `    DocumentBleedInsideOrLeftOffset="0" DocumentBleedOutsideOrRightOffset="0" />`,
    `</idPkg:Preferences>`,
  ].join("\n");
}

const PAGE_H = 841.889763778;
const PAGE_W = 595.2755905509999;
const MARGIN = 36;

const MASTER_SPREAD_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:MasterSpread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="${DOM}">
  <MasterSpread Self="ud8" Name="A-Master" NamePrefix="A" BaseName="A-Master"
    PageCount="1" ShowMasterItems="true" AllowPageShuffle="true" BindingLocation="0">
    <Page Self="ubd" MasterPageTransform="1 0 0 1 0 0" Name="1"
      AppliedMaster="$ID/[None]" PageColor="Nothing"
      GridStartingPoint="TopOutside" UseMasterGrid="true" OverrideList="" TabOrder="">
      <Properties>
        <Descriptor type="list"><ListItem type="string"></ListItem></Descriptor>
      </Properties>
      <MarginPreference ColumnCount="1" ColumnGutter="12" Top="36" Bottom="36" Left="36" Right="36" />
    </Page>
  </MasterSpread>
</idPkg:MasterSpread>`.replace("${DOM}", DOM);

/** Spread with a single text frame covering the page content area. */
function spreadXml(): string {
  const top = MARGIN;
  const left = MARGIN;
  const bottom = PAGE_H - MARGIN;
  const right = PAGE_W - MARGIN;
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="${DOM}">`,
    `  <Spread Self="ud1" PageCount="1" BindingLocation="0"`,
    `    AllowPageShuffle="true" ShowMasterItems="true" FlattenerOverride="Default">`,
    `    <Page Self="ud6" AppliedMaster="ud8" MasterPageTransform="1 0 0 1 0 0"`,
    `      Name="1" GeometricBounds="0 0 ${PAGE_H} ${PAGE_W}"`,
    `      ItemTransform="1 0 0 1 0 0" PageColor="Nothing"`,
    `      GridStartingPoint="TopOutside" UseMasterGrid="true" OverrideList="" TabOrder="">`,
    `      <Properties>`,
    `        <Descriptor type="list"><ListItem type="string"></ListItem></Descriptor>`,
    `      </Properties>`,
    `      <MarginPreference ColumnCount="1" ColumnGutter="12" Top="${MARGIN}" Bottom="${MARGIN}" Left="${MARGIN}" Right="${MARGIN}" />`,
    `    </Page>`,
    `    <TextFrame Self="tf1" ParentStory="ub1"`,
    `      ContentType="TextType"`,
    `      GeometricBounds="${top} ${left} ${bottom} ${right}"`,
    `      ItemTransform="1 0 0 1 0 0">`,
    `      <Properties>`,
    `        <PathGeometry>`,
    `          <GeometryPathType PathOpen="false">`,
    `            <PathPointArray>`,
    `              <PathPointType Anchor="${left} ${top}" LeftDirection="${left} ${top}" RightDirection="${left} ${top}"/>`,
    `              <PathPointType Anchor="${right} ${top}" LeftDirection="${right} ${top}" RightDirection="${right} ${top}"/>`,
    `              <PathPointType Anchor="${right} ${bottom}" LeftDirection="${right} ${bottom}" RightDirection="${right} ${bottom}"/>`,
    `              <PathPointType Anchor="${left} ${bottom}" LeftDirection="${left} ${bottom}" RightDirection="${left} ${bottom}"/>`,
    `            </PathPointArray>`,
    `          </GeometryPathType>`,
    `        </PathGeometry>`,
    `      </Properties>`,
    `    </TextFrame>`,
    `  </Spread>`,
    `</idPkg:Spread>`,
  ].join("\n");
}

/**
 * Story containing a header (DS name + version) and one paragraph per
 * semantic style, each with the matching AppliedParagraphStyle.
 */
function storyXml(
  dsName: string,
  version: string | undefined,
  styles: ResolvedScaleEntry[]
): string {
  const versionSuffix = version ? ` · ${version}` : "";
  const sampleText = "The quick brown fox jumps over the lazy dog";

  const styleParagraphs = styles.map((s) => [
    `    <ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/${xmlAttr(s.name)}">`,
    `      <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">`,
    `        <Content>${xmlAttr(s.label)} \u2014 ${xmlAttr(sampleText)}</Content>`,
    `        <Br />`,
    `      </CharacterStyleRange>`,
    `    </ParagraphStyleRange>`,
  ].join("\n")).join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="${DOM}">`,
    `  <Story Self="ub1" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/">`,
    `    <StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" />`,
    `    <InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false" />`,
    `    <ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle">`,
    `      <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">`,
    `        <Content>${xmlAttr(dsName + versionSuffix)}</Content>`,
    `        <Br />`,
    `      </CharacterStyleRange>`,
    `    </ParagraphStyleRange>`,
    styleParagraphs,
    `  </Story>`,
    `</idPkg:Story>`,
  ].join("\n");
}

const BACKING_STORY_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:BackingStory xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="${DOM}">
  <BackingStory/>
</idPkg:BackingStory>`.replace("${DOM}", DOM);

const TAGS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Tags xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="${DOM}">
</Tags>`.replace("${DOM}", DOM);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildIdmlFiles(options: IdmlOptions): Map<string, string> {
  const { dsName, typographyStyles, colorGroups, version } = options;
  const fontFamilies = typographyStyles.map((s) => s.fontFamily);

  return new Map([
    ["mimetype",                              "application/vnd.adobe.indesign-idml-package"],
    ["META-INF/container.xml",               CONTAINER_XML],
    ["META-INF/metadata.xml",                METADATA_XML],
    ["designmap.xml",                         designmapXml(dsName)],
    ["Resources/Fonts.xml",                  fontsXml(fontFamilies)],
    ["Resources/Styles.xml",                 stylesXml(dsName, typographyStyles)],
    ["Resources/Preferences.xml",            preferencesXml()],
    ["Resources/Graphic.xml",               graphicXml(colorGroups)],
    ["MasterSpreads/MasterSpread_ud8.xml",   MASTER_SPREAD_XML],
    ["Spreads/Spread_ud1.xml",               spreadXml()],
    ["Stories/Story_ub1.xml",               storyXml(dsName, version, typographyStyles)],
    ["XML/BackingStory.xml",                 BACKING_STORY_XML],
    ["XML/Tags.xml",                         TAGS_XML],
  ]);
}

export function colorRampsToIdmlGroups(ramps: Record<string, ColorRamp>): IdmlColorGroup[] {
  return Object.entries(ramps).map(([name, ramp]) => {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      name: label,
      swatches: RAMP_STEPS.map((step) => ({
        name: `${label} ${step}`,
        hex: ramp[step] ?? "#000000",
      })),
    };
  });
}

export function semanticColorsToIdmlGroup(
  roles: Record<string, string>,
  groupName = "Semantic"
): IdmlColorGroup {
  return {
    name: groupName,
    swatches: Object.entries(roles).map(([role, hex]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1).replace(/-/g, " "),
      hex,
    })),
  };
}
