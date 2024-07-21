struct FragmentInput
{
  @location(0) uv: vec2f
};

@fragment
fn main(in: FragmentInput) -> @location(0) vec4f
{
  return vec4(in.uv, 0, 1);
}
