# Local About demonstration content

22 September 2026. The owner explicitly requested dummy content to see the
implemented About room. The setup is live at `http://localhost:3000/about` and
uses the unchanged implementation from `5f2bb73`.

- Main square frame: fictional portrait.
- Left / GitHub: warm workspace photograph, existing `https://github.com` link.
- Center / LinkedIn: fictional portrait, existing `https://www.linkedin.com` link.
- Right / Website: mountain-lake photograph, new `https://example.com` link.

All three images are AI-generated demonstration content. They do not depict the
owner, the owner's workspace or travels. Original PNGs, full-resolution WebP
delivery files, hashes and the exact prompts are retained in
[the asset folder](../../../../scripts/assets/about-demos/PROMPTS.md) and
[manifest](../../../../scripts/assets/about-demos/manifest.json).
The displayed art was generated with the built-in image-generation tool;
delivery encoding uses WebP quality 90 at the original 1254 × 1254 dimensions.

The setup reused the two exact untouched seed links. Both drafts equaled their
published snapshots, all About slots were empty, and identity had no portrait or
divergent draft. Validation was checked before writing so unrelated fields could
not be silently dropped. Existing-record saves and publication used fresh
revision guards through the normal authenticated loopback APIs. The three images
were uploaded and explicitly published before parent records.

[Setup results](setup.json) record 34 → 38 content records: three media records
and one Website link were added. All 31 unrelated existing records are identical
to the private before snapshot. Only portrait fields changed on Identity & copy;
only About placement/photo/crop fields changed on the existing social links.
Contact monitor placement, names, URLs, biography, journal and other room content
were preserved. Anonymous media responses matched all three checked-in delivery
hashes. Private before/after snapshots remain ignored under `work/about-demo/`
and are not committed; the evidence contains IDs and hashes only.

The original approximately 2 MiB portrait PNG and a 1,475,502-byte lossless WebP
both received HTTP 413 before any record was created. High-quality delivery WebP
files of 165–211 kB uploaded successfully (545,676 bytes total). The rejecting
layer's precise limit was not investigated; no server limit or runtime code was
changed for this content task. Those failed attempts did not modify the store.

[Desktop](desktop.jpg), [phone](phone.jpg) and [Reading view](reader.jpg) captures
show the actual local store through hidden built-in Chromium. Phone viewport is
390 × 844; the three targets remain about 26.31 pixels square. Desktop viewport
is 1280 × 720. This is not a physical phone or Safari check. No application test
suite was run against the main store; validation here is the intentional content
write, preservation comparisons, public-asset hashes and visual inspection.
The [independent review](review.md) scored **94/100**, approved without blockers.
It independently rechecked the live content and anonymous media responses.

Replace the images in **Content studio → Identity & copy / Social links**. To
remove this example, clear and publish the portrait selection. On GitHub and
LinkedIn, clear both **About position** and **Social photo**, then save/publish;
setting the position to Off alone still retains its image reference. Remove the
demo Website record before deleting the now-unused demo media if desired.
Do not blindly restore the private snapshot after later owner edits. The sample
Website is not assigned to a Contact monitor, but appears in Contact's Reading
view like all published social links.
