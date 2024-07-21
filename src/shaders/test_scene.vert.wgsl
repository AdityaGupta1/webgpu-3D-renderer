@group(0) @binding(0) var<uniform> viewProjMat: mat4x4<f32>;

@vertex
fn main(@location(0) pos: vec3f) -> @builtin(position) vec4f
{
    return viewProjMat * vec4(pos, 1);
}
