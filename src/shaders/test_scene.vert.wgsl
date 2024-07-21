@group(0) @binding(0) var<uniform> viewProjMat: mat4x4<f32>;

struct VertexInput
{
    @location(0) pos: vec3f,
    @location(1) uv: vec2f
};

struct VertexOutput
{
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f
};

@vertex
fn main(in: VertexInput) -> VertexOutput
{
    var out: VertexOutput;
    out.pos = viewProjMat * vec4(in.pos, 1);
    out.uv = in.uv;
    return out;
}
