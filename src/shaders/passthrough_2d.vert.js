export const passthrough2dVertSrc = `

@vertex
fn main(@location(0) pos: vec2f) -> @builtin(position) vec4f
{
    return vec4(pos, 0, 1);
}

`;