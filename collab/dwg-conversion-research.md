# DWG Conversion Research

**Owner:** Sol/Codex  
**Status:** Research complete as of 25 July 2026 — no integration or code  
**Decision blocked by:** Mannu's permission for server/cloud processing and the
data-sensitivity policy for survey drawings.

## Executive decision

UrbanOS should keep one validated canonical geometry model and generate DXF and
PDF from it. DWG is a delivery format, not a second geometry engine.

Recommended path:

1. **Now:** perfect and validate canonical geometry plus DXF/PDF.
2. **Pilot, if external processing is allowed:** convert accepted DXF to DWG
   through CloudConvert, then convert the DWG back to DXF and compare all
   critical coordinates, layers, units and dimensions before releasing it.
3. **Production cloud route:** Autodesk AutoCAD Automation when native AutoCAD
   behaviour and CAD-standard checks are most important.
4. **Production controlled/self-hosted route:** ODA Drawings SDK with a
   Sustaining-or-higher membership when drawings must remain in our environment.
5. **No server and no external upload:** ship DXF/PDF until a licensed local ODA
   or desktop route is approved.

An MCP may orchestrate or inspect CAD operations, but it must not replace the
deterministic geometry kernel or its acceptance tests.

## Route comparison

| Route | Deployment and licence | What it can do | Main limitation | UrbanOS fit |
|---|---|---|---|---|
| **ezdxf** | MIT-licensed Python; local/server on major operating systems | Read, write and validate DXF through R2018 | Official documentation states it cannot create or convert DWG | Strong DXF writer/round-trip validator; not a DWG solution |
| **ODA File Converter** | Windows/Linux/macOS desktop or command line | Batch DWG ⇄ DXF/version conversion with optional audit | Free download is non-commercial only for non-members | Evaluation/internal testing only unless commercial ODA terms are obtained |
| **ODA Drawings SDK / inWEB** | Cross-platform SDK. Commercial tier is $3,000 first year but disallows Web/SaaS; Sustaining is $7,500 first year and allows it | Create, edit and save DWG/DXF; ODA also supports PDF publishing | Paid integration and licensing; exact deployment terms must be contracted | Best long-term controlled/self-hosted route |
| **CloudConvert API** | Hosted API; backend credential required | Explicit DXF → DWG and DWG → DXF/PDF conversion | Survey files leave our system; conversion engine is opaque | Fastest pilot only, with permission and mandatory round-trip validation |
| **Autodesk AutoCAD Automation API** | Autodesk-hosted cloud service | Runs real AutoCAD add-ins/scripts/AutoLISP to create, modify, check and plot DWG | Cloud setup, OAuth, file transfer and ongoing service cost | Best production cloud route for native AutoCAD behaviour |
| **Autodesk RealDWG** | $8,000/year (or €7,500 in EMEA/India) for up to 10,000 users; Windows desktop only | Native DWG/DXF read and write | Official licensing page says server hosting is prohibited and PDF plotting is absent | Not suitable for the UrbanOS web/server architecture |
| **ODA MCP Servers** | ODA Core SDK subscription; local STDIO or networked HTTPS planned | Native DWG model inspection and basic authoring through MCP | Official status is **pre-release, coming Q3 2026** | Re-evaluate after release; not available as today's production dependency |

## Mandatory DWG acceptance gate

No converted DWG passes merely because AutoCAD opens it. The converter must
produce a validation report proving:

1. DWG opens without audit errors.
2. Declared DWG version matches the selected delivery profile.
3. Drawing units are metres and insertion scale is correct.
4. Model-space coordinates match canonical geometry within 0.001 m.
5. Boundary closure, area and orientation still pass.
6. Required layers, names, colours/line types and entity classes survive.
7. Dimension measurements and displayed text remain geometry-derived.
8. No entity is dropped, duplicated, flattened or moved.
9. DXF → DWG → DXF round-trip returns equivalent accepted geometry.
10. A rendered DWG/PDF visual comparison shows no clipping, font substitution
    or sheet-scale change.
11. Conversion provider, engine/version, timestamp and validation result are
    recorded in the drawing evidence.
12. External processing occurs only with explicit data-handling approval.

Failure at any step keeps the DWG at **Research Draft** and blocks release.

## Security and architecture notes

- CloudConvert says transfers are SSL encrypted, conversions run in isolated
  containers and files are deleted after processing. This reduces risk but does
  not remove the need for owner consent and a data-processing policy.
- Autodesk Automation work items upload inputs and write outputs through
  Autodesk/cloud URLs. It therefore requires an approved cloud architecture.
- ODA Drawings can support a controlled deployment, but Web/SaaS rights begin
  at the Sustaining membership tier.
- ODA File Converter cannot be adopted commercially under the free,
  non-member permission.
- API credentials must remain server-side; no conversion secret may be shipped
  to the browser.
- All third-party conversion routes require a fallback that preserves the
  already-validated DXF/PDF when conversion is unavailable.

## Primary official sources

- ezdxf capabilities and explicit DWG limitation:
  https://ezdxf.readthedocs.io/en/stable/introduction.html
- ODA File Converter features:
  https://www.opendesign.com/GUESTFILES/ODA_FILE_CONVERTER
- ODA File Converter non-commercial restriction:
  https://www.opendesign.com/faq/question/what-are-oda-viewer-and-oda-file-converter
- ODA Drawings SDK capabilities:
  https://www.opendesign.com/products/drawings
- ODA membership and Web/SaaS rights:
  https://www.opendesign.com/oda-membership
- ODA MCP status and planned deployment:
  https://www.opendesign.com/products/mcp-servers
- CloudConvert supported DWG/DXF conversions:
  https://cloudconvert.com/dwg-converter
- CloudConvert API:
  https://cloudconvert.com/docs/getting-started/introduction
- CloudConvert security:
  https://cloudconvert.com/security
- Autodesk AutoCAD Automation:
  https://aps.autodesk.com/automation-apis
- Autodesk Automation work-item flow:
  https://get-started.aps.autodesk.com/tutorials/design-automation/execute-workitem
- Autodesk RealDWG licensing and server restriction:
  https://www.techsoft3d.com/oem/realdwg/

