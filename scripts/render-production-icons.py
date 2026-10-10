import math
from PIL import Image, ImageDraw

def render_icon(size=2048, maskable=False):
    # Create canvas
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = size * 0.12 if maskable else 0
    box_size = size - (2 * margin)
    rx = box_size * 0.22  # Squircle corner radius

    # Background Squircle
    x0, y0 = margin, margin
    x1, y1 = size - margin, size - margin
    
    # Gradient or solid cobalt blue (#2563EB)
    draw.rounded_rectangle([x0, y0, x1, y1], radius=rx, fill=(37, 99, 235, 255))
    
    # Border highlight
    draw.rounded_rectangle([x0 + 4, y0 + 4, x1 - 4, y1 - 4], radius=rx - 4, outline=(255, 255, 255, 45), width=int(size * 0.008))

    # Grid coordinates lines
    grid_alpha = 36
    grid_color = (255, 255, 255, grid_alpha)
    lw = max(2, int(size * 0.008))

    pad_grid = margin + box_size * 0.16
    step = (box_size * 0.68) / 2
    for i in range(3):
        pos = pad_grid + i * step
        # horizontal line
        draw.line([(pad_grid, pos), (size - pad_grid, pos)], fill=grid_color, width=lw)
        # vertical line
        draw.line([(pos, pad_grid), (pos, size - pad_grid)], fill=grid_color, width=lw)

    # Pin parameters (centered in the box)
    cx = size / 2
    cy_box = margin + box_size / 2
    
    # Pin head circle
    r_head = box_size * 0.27
    cy_head = cy_box - box_size * 0.04
    tip_y = cy_box + box_size * 0.33
    tip_x = cx

    dist = tip_y - cy_head
    if dist > r_head:
        sin_a = r_head / dist
        cos_a = math.sqrt(1 - sin_a * sin_a)
        
        # Tangent angles from vertical (downwards is 0)
        # Tangent points:
        # Vector from cy_head to tip is (0, dist)
        # Tangent point 1 (left):
        # Angle from center: 90 - alpha or from bottom:
        # dx = r_head * cos_a, dy = r_head * sin_a
        tx_left = cx - r_head * cos_a
        ty_left = cy_head + r_head * sin_a

        tx_right = cx + r_head * cos_a
        ty_right = cy_head + r_head * sin_a

        # Generate arc points around the top
        arc_points = []
        angle_left = math.atan2(ty_left - cy_head, tx_left - cx)
        angle_right = math.atan2(ty_right - cy_head, tx_right - cx)
        
        # normalize: we want the arc going OVER the top from left to right
        # angle_left is ~ 0.5 rad (below horizontal), going counter-clockwise over top to angle_right ~ 2.6 rad
        steps = 120
        # angle goes from angle_left counter-clockwise (decreasing angle in standard computer coords) to angle_right - 2*pi
        start_angle = angle_left
        end_angle = angle_right - 2 * math.pi
        
        for s in range(steps + 1):
            theta = start_angle + (end_angle - start_angle) * (s / steps)
            px = cx + r_head * math.cos(theta)
            py = cy_head + r_head * math.sin(theta)
            arc_points.append((px, py))

        pin_polygon = [(tip_x, tip_y)] + arc_points
        draw.polygon(pin_polygon, fill=(255, 255, 255, 255))
    else:
        draw.ellipse([cx - r_head, cy_head - r_head, cx + r_head, cy_head + r_head], fill=(255, 255, 255, 255))

    # Eye in center of pin
    r_eye_outer = r_head * 0.40
    draw.ellipse([cx - r_eye_outer, cy_head - r_eye_outer, cx + r_eye_outer, cy_head + r_eye_outer], fill=(37, 99, 235, 255))

    r_eye_inner = r_head * 0.18
    draw.ellipse([cx - r_eye_inner, cy_head - r_eye_inner, cx + r_eye_inner, cy_head + r_eye_inner], fill=(255, 255, 255, 255))

    return img

print("Generating 2048x2048 master renders...")
master_standard = render_icon(2048, maskable=False)
master_maskable = render_icon(2048, maskable=True)

# Save standard icons
icon_512 = master_standard.resize((512, 512), Image.Resampling.LANCZOS)
icon_512.save('public/icon-512.png', 'PNG', optimize=True)

icon_192 = master_standard.resize((192, 192), Image.Resampling.LANCZOS)
icon_192.save('public/icon-192.png', 'PNG', optimize=True)

# Save maskable icon
icon_maskable = master_maskable.resize((512, 512), Image.Resampling.LANCZOS)
icon_maskable.save('public/icon-maskable-512.png', 'PNG', optimize=True)

# Save multi-size favicon.ico
fav_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
fav_imgs = [master_standard.resize(s, Image.Resampling.LANCZOS) for s in fav_sizes]
fav_imgs[0].save('public/favicon.ico', format='ICO', sizes=fav_sizes, append_images=fav_imgs[1:])

print("Successfully generated all production icons and favicon!")
