/**
 * idml.ts — InDesign Markup Language (.idml) exporter
 *
 * Generates the XML file tree for an IDML package containing:
 *   - All color swatches from the design system ramps + semantic roles
 *   - All paragraph styles from the semantic type scale
 *
 * Returns a Map<filepath, content> — the caller is responsible for
 * zipping these into an .idml file (which is just a ZIP with a specific
 * internal structure).
 *
 * Example (using fflate in browser/Next.js):
 *   import { strToU8, zip } from "fflate";
 *   const files = buildIdmlFiles({ ... });
 *   const fflateInput = Object.fromEntries(
 *     [...files].map(([k, v]) => [k, strToU8(v)])
 *   );
 *   zip(fflateInput, (err, data) => downloadBlob(data, "tokens.idml"));
 *
 * Spec reference: https://wwwimages.adobe.com/content/dam/acom/en/devnet/indesign/sdk/cs6/idml/idml-specification.pdf
 */

import { RAMP_STEPS, type ColorRamp } from "../tokens/colorRamps.js";
import { type ResolvedScaleEntry } from "../tokens/scaleDefinition.js";

// ---------------------------------------------------------------------------
// Public input types
// ---------------------------------------------------------------------------

export interface IdmlColorGroup {
  /** Group name shown in InDesign Swatches panel, e.g. "Primary" */
  name: string;
  swatches: Array<{
    /** Swatch name, e.g. "Primary 500" */
    name: string;
    /** Hex color, e.g. "#0c8ce9" */
    hex: string;
  }>;
}

export interface IdmlOptions {
  /** Design system name — used as style group label and document title */
  dsName: string;
  /** Resolved type scale entries (use resolveSemanticScale() from scaleDefinition) */
  typographyStyles: ResolvedScaleEntry[];
  /** Color groups to write as swatches */
  colorGroups: IdmlColorGroup[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb255(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function xmlAttr(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Make a safe Self ID from a name string (no spaces or special chars). */
function selfId(prefix: string, name: string): string {
  return `${prefix}/${name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

// ---------------------------------------------------------------------------
// XML generators
// ---------------------------------------------------------------------------

function graphicXml(colorGroups: IdmlColorGroup[]): string {
  // InDesign requires process inks and these specific system colors to be present.
  const colors: string[] = [
    // Process inks (required)
    `  <Ink Self="Ink/$ID/Process Cyan"    Name="$ID/Process Cyan"    PrintOrder="1" IsProcess="true" IsOpaque="true" NeutralDensity="0.61" TrapOrder="1" />`,
    `  <Ink Self="Ink/$ID/Process Magenta" Name="$ID/Process Magenta" PrintOrder="2" IsProcess="true" IsOpaque="true" NeutralDensity="0.61" TrapOrder="2" />`,
    `  <Ink Self="Ink/$ID/Process Yellow"  Name="$ID/Process Yellow"  PrintOrder="3" IsProcess="true" IsOpaque="true" NeutralDensity="0.61" TrapOrder="3" />`,
    `  <Ink Self="Ink/$ID/Process Black"   Name="$ID/Process Black"   PrintOrder="4" IsProcess="true" IsOpaque="true" NeutralDensity="1"    TrapOrder="4" />`,
    // Required system swatches — must use $ID/ prefix (InDesign built-in resources)
    `  <Color Self="Color/$ID/Paper"        Model="Process"      Space="CMYK" ColorValue="0 0 0 0"         Name="$ID/Paper" />`,
    `  <Color Self="Color/$ID/Black"        Model="Process"      Space="CMYK" ColorValue="0 0 0 100"       Name="$ID/Black" />`,
    `  <Color Self="Color/$ID/Registration" Model="Registration" Space="CMYK" ColorValue="100 100 100 100" Name="$ID/Registration" />`,
    `  <Color Self="Color/$ID/White"        Model="Process"      Space="CMYK" ColorValue="0 0 0 0"         Name="$ID/White" />`,
  ];

  for (const group of colorGroups) {
    for (const swatch of group.swatches) {
      const [r, g, b] = hexToRgb255(swatch.hex);
      colors.push(
        `  <Color Self="${xmlAttr(selfId("Color", swatch.name))}" ` +
        `Model="Process" Space="RGB" ` +
        `ColorValue="${r} ${g} ${b}" ` +
        `Name="${xmlAttr(swatch.name)}" />`
      );
    }
  }

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">`,
    ...colors,
    `</idPkg:Graphic>`,
  ].join("\n");
}

function stylesXml(dsName: string, styles: ResolvedScaleEntry[]): string {
  const groupSelf = selfId("ParagraphStyleGroup", dsName);

  const paraStyles = styles.map((s) => {
    const self = `ParagraphStyleGroup/${xmlAttr(dsName)}/${xmlAttr(s.name)}`;
    return [
      `      <ParagraphStyle`,
      `        Self="${xmlAttr(self)}"`,
      `        Name="${xmlAttr(s.label)}"`,
      `        PointSize="${s.pointSize}"`,
      `        Leading="${s.leadingPt}"`,
      `        Tracking="${s.tracking}"`,
      `        AppliedFont="${xmlAttr(s.fontFamily)}"`,
      `        FontStyle="${xmlAttr(s.weight)}"`,
      `      />`,
    ].join("\n");
  });

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">`,
    `  <RootParagraphStyleGroup Self="RootParagraphStyleGroup">`,
    `    <ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]" />`,
    `    <ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle" />`,
    `    <ParagraphStyleGroup Self="${xmlAttr(groupSelf)}" Name="${xmlAttr(dsName)}">`,
    ...paraStyles,
    `    </ParagraphStyleGroup>`,
    `  </RootParagraphStyleGroup>`,
    `  <RootCharacterStyleGroup Self="RootCharacterStyleGroup">`,
    `    <CharacterStyle Self="CharacterStyle/$ID/[No character style]" Name="[No character style]" />`,
    `  </RootCharacterStyleGroup>`,
    `  <RootObjectStyleGroup Self="RootObjectStyleGroup">`,
    `    <ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]" />`,
    `    <ObjectStyle Self="ObjectStyle/$ID/[Normal Graphics Frame]" Name="$ID/[Normal Graphics Frame]" />`,
    `    <ObjectStyle Self="ObjectStyle/$ID/[Normal Text Frame]" Name="$ID/[Normal Text Frame]" />`,
    `  </RootObjectStyleGroup>`,
    `  <RootTableStyleGroup Self="RootTableStyleGroup">`,
    `    <TableStyle Self="TableStyle/$ID/[Basic Table]" Name="$ID/[Basic Table]" />`,
    `  </RootTableStyleGroup>`,
    `  <RootCellStyleGroup Self="RootCellStyleGroup">`,
    `    <CellStyle Self="CellStyle/$ID/[None]" Name="$ID/[None]" />`,
    `  </RootCellStyleGroup>`,
    `</idPkg:Styles>`,
  ].join("\n");
}

function designmapXml(dsName: string): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Document DOMVersion="18.0" StoryList="u1b8" ActiveLayer="ub6"`,
    `  xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"`,
    `  Self="d" Name="${xmlAttr(dsName)}">`,
    `  <Layer Self="ub6" Name="Layer 1" />`,
    `  <idPkg:Fonts src="Resources/Fonts.xml"/>`,
    `  <idPkg:Styles src="Resources/Styles.xml"/>`,
    `  <idPkg:Preferences src="Resources/Preferences.xml"/>`,
    `  <idPkg:Graphic src="Resources/Graphic.xml"/>`,
    `  <idPkg:MasterSpread src="MasterSpreads/MasterSpread_u27b.xml"/>`,
    `  <idPkg:Spread src="Spreads/Spread_u11b.xml"/>`,
    `  <idPkg:Story src="Stories/Story_u1b8.xml"/>`,
    `</Document>`,
  ].join("\n");
}

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="designmap.xml" />
  </rootfiles>
</container>`;

const FONTS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
</idPkg:Fonts>`;

// DocumentPreference is required — InDesign won't open without page dimensions.
const PREFERENCES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <DocumentPreference
    PageHeight="792" PageWidth="612" PagesPerDocument="1"
    FacingPages="false" AllowPageShuffle="true"
    DocumentBleedTopOffset="0" DocumentBleedBottomOffset="0"
    DocumentBleedInsideOrLeftOffset="0" DocumentBleedOutsideOrRightOffset="0"
    SlugTopOffset="0" SlugBottomOffset="0"
    SlugInsideOrLeftOffset="0" SlugRightOrOutsideOffset="0"
  />
</idPkg:Preferences>`;

// MasterSpread — pages must not self-reference as their own master.
// Use $ID/[None] for master-less pages on the A-Master.
const MASTER_SPREAD_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:MasterSpread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <MasterSpread Self="u27b" Name="A-Master" NamePrefix="A" BaseName="A-Master"
    PageCount="1" ShowMasterItems="true" AllowPageShuffle="true" BindingLocation="0">
    <FlattenerPreference LineArtAndTextResolution="300" GradientAndMeshResolution="150"
      ClipComplexRegions="false" ConvertAllStrokesToOutlines="false"
      ConvertAllTextToOutlines="false" RasterVectorBalance="75" />
    <Page Self="ubb" MasterPageTransform="1 0 0 1 -306 -396" Name="1"
      AppliedMaster="$ID/[None]" PageColor="Nothing"
      GridStartingPoint="TopOutside" UseMasterGrid="true" OverrideList="" TabOrder="">
      <Properties>
        <Descriptor type="list"><ListItem type="string">1</ListItem></Descriptor>
      </Properties>
      <PagePreference ColumnsPositions="0 576" />
    </Page>
  </MasterSpread>
</idPkg:MasterSpread>`;

const SPREAD_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <Spread Self="u11b" PageCount="1" BindingLocation="0"
    AllowPageShuffle="true" ShowMasterItems="true" FlattenerOverride="Default">
    <FlattenerPreference LineArtAndTextResolution="300" GradientAndMeshResolution="150"
      ClipComplexRegions="false" ConvertAllStrokesToOutlines="false"
      ConvertAllTextToOutlines="false" RasterVectorBalance="75" />
    <Page Self="u11c" MasterPageTransform="1 0 0 1 -306 -396" Name="1"
      AppliedMaster="u27b" PageColor="Nothing"
      GridStartingPoint="TopOutside" UseMasterGrid="true" OverrideList="" TabOrder="">
      <Properties>
        <Descriptor type="list"><ListItem type="string">1</ListItem></Descriptor>
      </Properties>
      <PagePreference ColumnsPositions="0 576" />
    </Page>
  </Spread>
</idPkg:Spread>`;

const STORY_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="18.0">
  <Story Self="u1b8" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/">
    <StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" />
    <InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false" />
    <ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/[No paragraph style]">
      <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">
        <Content> </Content>
      </CharacterStyleRange>
    </ParagraphStyleRange>
  </Story>
</idPkg:Story>`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the full IDML file tree as a Map<filepath, content string>.
 *
 * The caller zips this into an .idml file. The `mimetype` entry must be
 * stored uncompressed and first in the ZIP (required by the IDML spec).
 */
export function buildIdmlFiles(options: IdmlOptions): Map<string, string> {
  const { dsName, typographyStyles, colorGroups } = options;

  return new Map([
    ["mimetype", "application/vnd.adobe.indesign-idml-package"],
    ["META-INF/container.xml", CONTAINER_XML],
    ["designmap.xml", designmapXml(dsName)],
    ["Resources/Fonts.xml", FONTS_XML],
    ["Resources/Preferences.xml", PREFERENCES_XML],
    ["Resources/Graphic.xml", graphicXml(colorGroups)],
    ["Resources/Styles.xml", stylesXml(dsName, typographyStyles)],
    ["MasterSpreads/MasterSpread_u27b.xml", MASTER_SPREAD_XML],
    ["Spreads/Spread_u11b.xml", SPREAD_XML],
    ["Stories/Story_u1b8.xml", STORY_XML],
  ]);
}

/**
 * Convert color ramps (step → hex maps) to IdmlColorGroups.
 * Each ramp key becomes a named group with one swatch per step.
 */
export function colorRampsToIdmlGroups(
  ramps: Record<string, ColorRamp>
): IdmlColorGroup[] {
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

/**
 * Add a flat list of semantic role swatches as their own group.
 * e.g. { background: "#0f0f0f", primary: "#0c8ce9", ... }
 */
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
