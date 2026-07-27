Local Blender working files (meshes, .blend/.blend1, exported textures) go
here, not in `public/`. Everything in `public/` is uploaded as a public
static asset on every `wrangler deploy`, regardless of whether it's tracked
by git - a `.gitignore` entry alone does not stop a file sitting inside
`public/` from being deployed.

This directory itself is gitignored (except this file) so nothing dropped
in here ends up committed or deployed by accident.
