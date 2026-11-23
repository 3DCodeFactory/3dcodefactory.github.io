const scenes = [ {
    id: "01",
    name: "晶圆缺陷检测暗室",
    category: "Interiors",
    backend: "Blender",
    prompt: "请按参考图制作一张芯片厂晶圆缺陷检测暗室的静态三维场景。画面主体是左侧的晶圆检测设备：白色显微镜筒、黑色镜头、带微调旋钮的载台，以及放在载台中央的圆形晶圆片。晶圆表面要能看出芯片阵列纹理和冷光下的彩虹衍射，这是视觉重点。右侧工作台上放主副两块显示器，主屏显示晶圆检测软件的灰度图像界面，副屏显示圆形晶圆总览，屏幕作为暗室中的主要冷光源。后方靠墙机柜需要做出设备面板、指示灯和故障般的彩色条纹，让安静的洁净环境里有一处彩色光效。整体保持暗室低照度，冷白光与机柜彩色光形成对比，设备与台面的黑灰金属、白色镜筒、屏幕玻璃和晶圆硅片质感要明确区分。\n\n空间按参考图的左近右远关系布置：显微镜和载台占据画面左半部前景，显示器位于中景偏右，机柜退到右后方，背景墙和门只作低对比衬托。各部件保持静态装配状态，不做交互动画。\n\n交付可编辑的.blend工程、GLB模型、所有本地贴图资产和PNG预览图；物体、材质、集合分别命名，贴图使用相对路径。完成建模后，从实际三维场景按参考图相同的机位、观察方向、取景范围和3:2画幅比例输出PNG主图，构图与参考图一致。",
    demo: null,
    video: "assets/videos/01-pan-hd.mp4",
    model: "01",
    summary: "半导体洁净暗室内的显微检测工位。左侧前景为白色显微镜筒、微调载台与呈现彩虹衍射纹理的圆形晶圆；右侧双联屏显示检测图像界面并提供冷白主光，与右后方机柜的彩色指示灯形成冷暖明暗对照。"
}, {
    id: "02",
    name: "林谷中的法式城堡",
    category: "Architecture",
    backend: "Three.js",
    prompt: "I'd like a 3D scene of a French chateau in a wooded valley, using the attached reference as the guide for the camera and overall layout. The chateau should be the main subject: a large pale limestone facade with a symmetrical central block, two projecting side wings, steep dark slate roofs, tall brick chimneys, many tall windows, and a central entrance with a small balcony. In front, a broad gravel drive curves from the lower foreground up to the entrance, with a low mossy stone wall and rounded topiary on either side; mature trees frame the view on the left and right, and wooded hills sit behind the building under a broad, soft sky. The mood should feel cinematic and hyper-real, with rich but restrained colors, tactile stone and slate, damp gravel, and soft volumetric light drifting through the trees.\n\nI'd love to be able to shift the scene between a cool overcast morning and a warmer late-afternoon glow and watch how the limestone, slate roofs, windows, and gravel drive respond, with mist and shadows changing across the valley. I'd also like to thin or gather the mist over the wooded hills and see the distant ridge, roof silhouettes, and tree line become clearer or more atmospheric.\n\nWhen it's finished, please export a PNG directly from the actual 3D scene. For this image-based brief, keep the camera position, viewing direction, framing, and aspect ratio the same as the reference image. While meeting the above requirements, please give full play to your creativity to enhance the overall aesthetic, composition, material texture, and lighting, making the work attractive and complete.",
    demo: "chateau",
    summary: "群山林谷环抱的法式石灰岩城堡。中轴对称主楼配陡坡板岩屋顶与高耸砖砌烟囱，弧形砂砾车道经修剪灌木与低矮石墙引向正门；支持在清晨薄雾与傍晚暖照之间实时切换天光与山谷雾量。"
}, {
    id: "04",
    name: "日本乡间通学路",
    category: "Architecture",
    backend: "Blender",
    prompt: "I’d like a static 3D scene based on the reference: a narrow Japanese countryside lane outside a school, seen from eye level looking straight down the road. On the left foreground, a weathered wooden house with tiled roof edges and a low stone wall sits close to the camera, with leafy bushes spilling over the wall. In front of it, a faded “watch for children” sign on a rusty pole shows two cartoon children and worn Japanese lettering, with chipped paint, dirt, and sun bleaching. A narrow asphalt lane runs through the middle toward the school, with a manhole cover and a drain grate in the foreground and soft patches of repair and wear. On the right, a bicycle shelter with a flat metal roof stands beside a concrete-block wall; two old bicycles are parked underneath, one with a front basket, both slightly aged. Beyond the shelter and wall, a white school building with rows of windows sits against a wooded hill and autumn trees. Utility poles and overhead wires run along the lane, and a stone gatepost marked with school-route signage stands near the school entrance. I want the composition to match the reference closely: left side heavier with the house and sign, right side opening to the shelter and school, the lane pulling the eye into the distance. Materials should feel distinct and lived-in—dark weathered wood, pale plaster, ceramic roof tiles, rough stone, concrete block, painted metal, rubber tires, paper and faded sign paint, dry leaves and asphalt. The lighting is late-afternoon sun from the left, casting long roof and pole shadows across the road, with warm light on the wooden facade and cooler shade in the alley. Please treat this as a static model only, with no interaction or functional elements. Deliver an editable .blend project, a GLB model, the local assets used, and a PNG preview. After finishing the 3D work, render the PNG from the actual scene with the same camera position, viewing direction, framing, crop, and aspect ratio as the reference image; don’t paint over it or make it as a separate illustration.",
    demo: null,
    video: "assets/videos/04-pan-hd.mp4",
    model: "04",
    summary: "日本乡间学校门外的缓坡通学路。沿街依次展开校门立面、木构单车棚、停放的自行车、电线杆与路侧挡土石墙，兼顾主视角构图与道路设施细节。"
}, {
    id: "06",
    name: "雨夜街角报刊亭",
    category: "Architecture",
    backend: "Three.js",
    prompt: "我想做一件雨后傍晚街角售货亭的三维作品，整体气质参考图那种老城市、微冷、潮湿又有暖光透出来的感觉。画面左侧是带深色雨篷的报刊亭，雨篷边缘有一排白色字，玻璃窗里亮着暖黄灯，能看到成排杂志、报纸和零碎商品；窗下靠着一只金属报纸架，旁边放一只旧木箱。右侧贴着深蓝色瓷砖墙，墙前立着一台浅蓝色的旧饮料售卖机，漆面斑驳掉漆带锈，红色商标很醒目，投币口和取币口被磨得发亮，侧边挂着装纸杯的金属筒，杯筒里叠着一摞白纸杯。售卖机和墙之间还有一块竖着的广告牌，地面是湿漉漉的石板路和沥青路，前景有水洼，能映出雨篷招牌、售卖机和窗内暖灯的倒影。整体色彩以蓝灰、深绿黑和旧金属色为主，点缀暖黄灯光和红色商标，材质上突出湿地面、旧漆、锈迹、玻璃反光、纸张和金属磨损的层次。默认视角从街面平视过去，稍微斜对售货亭，让报刊亭占左侧、售卖机贴右侧瓷砖墙，前景留出水洼和反光，取景横向。想加入一两处和内容贴合的互动：我希望可以操作旧饮料售卖机，像投币或按下选择一样，看到纸杯从侧边杯筒或出口处出现、机器局部亮起或金属反光起变化，同时水洼里的倒影跟着轻轻动一下；也想靠近看看前景水洼，轻触或拨动时水面泛开细纹，把招牌和暖灯的倒影揉开后再慢慢合拢。具体操作入口和呈现方式你定。完成后请从实际三维作品输出 PNG；带图任务与参考图保持相同机位、观察方向、取景范围和画幅比例，无图任务按正文描述的默认视角拍摄。在满足上述需求的前提下，请充分发挥创作能力，提升整体美感、构图、材质质感与光影表现，让作品具有吸引力和完成度。",
    demo: "newsstand",
    summary: "雨后傍晚的城市街角报刊亭与复古冷饮机。深色雨篷下透出暖黄橱窗灯光，照亮密集陈列的报刊杂志，与潮湿路面的冷色倒影交织；支持天气与照明实时交互。"
}, {
    id: "07",
    name: "雨林高空滑索平台",
    category: "Nature",
    backend: "Blender",
    prompt: "Please build a static 3D scene of the rainforest zipline start shown in the reference image. The left side is dominated by a massive mossy tree; a weathered timber platform is built around its trunk, with a plank deck, rough railings, and a hanging sign with a leaf mark and the text “JUNGLE TRAILS — HIGHER, FURTHER, WILDER.” A rope ladder drops from the platform down the slope toward the foreground. The zipline cable leaves from the upper right of the platform and runs up and out of frame. On the right, a small equipment shelter with a corrugated roof stands beside the trail; several climbing harnesses in black, gray, orange and red hang in a cluster, with metal buckles and carabiners, and thick natural-fiber ropes are coiled and draped from the beam. The ground is a wet muddy slope with exposed roots, leaf litter, shallow puddles and drag/slide marks leading toward the platform. Dense tropical foliage frames the scene: broad glossy leaves in the near left foreground, thin trunks and hanging vines in the middle ground, and a deep green canopy behind. Use the same spatial arrangement and relative scale as the reference: tree and platform on the left, gear rack on the right, and an open misty forest gap in the center. Materials should read as wet wood, moss, muddy soil, natural rope, metal hardware and waxy leaves. Lighting should be dappled sunlight filtering through the canopy, with bright highlights on wet leaves and mud, cooler shadows in the understory, and a soft humid haze in the distance. Keep the scene static—gear hanging at rest, ropes coiled, no people. Focus on the tactile wetness, the layered depth from foreground plants to the misty background, and the believable joinery and contact points between platform, tree, ladder, cable and shelter. After modeling, render a PNG from the actual 3D scene with the same camera position, viewing direction, framing and aspect ratio as the reference. Deliver an editable .blend project, a GLB model, the local assets used, and the PNG preview.",
    demo: null,
    video: "assets/videos/07-pan-hd.mp4",
    model: "07",
    summary: "热带雨林树冠层的高空滑索出发平台。围绕巨树主干搭建木构悬挑平台、连接吊桥、张紧钢索与装备挂架，整齐悬挂安全带与头盔。"
}, {
    id: "08",
    name: "航空博物馆机库",
    category: "Interiors",
    backend: "Blender",
    prompt: "I want to model the central hangar display shown in the reference: a large four-engine propeller aircraft parked dead center on the exhibit line, facing straight toward the camera. It should read as a weathered silver airliner with a rounded nose, dark cockpit glazing, a row of small cabin windows, four engine nacelles carried on straight wings, and four propellers with black blades and yellow tips. The landing gear should be down, with the nose wheel on the center guide line and the main wheels planted symmetrically. Around the aircraft, the hangar should feel vast and highly ordered: exposed steel roof trusses, rows of hanging pendant lamps and industrial light fixtures, overhead walkways and maintenance scaffolding on both sides, tall vertical banners dropping from the ceiling, and exhibit graphics plus partial aircraft along the left and right flanks. At the far end, the back wall and restoration banners should close the perspective. Use polished gray concrete for the floor, with broad cold reflections of the overhead lights stretching toward the viewer, along with soft scuffs and a subtle center seam. The main lighting should be cool and even from above, with the aircraft catching brighter highlights along the fuselage and wings; the floor reflections and repeated lamps should reinforce the central vanishing point. Focus on the strict symmetry, the spatial depth of the hangar, the contrast between the metallic aircraft and the massive gray interior, and the glossy floor reflection. Please keep this as a static display model with all aircraft parked, landing gear lowered, and nothing in motion. Deliver an editable .blend project, a GLB model, the local assets, and a PNG preview. After modeling, render the PNG from the actual 3D scene using the same camera position, view direction, framing, and aspect ratio as the reference image.",
    demo: null,
    video: "assets/videos/08-hero-multiview-hd.mp4",
    model: "08",
    summary: "大跨度钢桁架机库与中央展出的四发螺旋桨客机。精细还原抛光铝制机身、机翼发动机短舱、四叶螺旋桨与驾驶舱风挡，并在环氧地坪上形成清晰倒影。"
}, {
    id: "09",
    name: "中古风校车房车",
    category: "Interiors",
    backend: "Blender",
    prompt: "Please build a static, fully modelled interior of a converted school bus in the described mid-century modern direction, using the reference image as the primary guide for layout, camera and material character. The scene is a long one-point aisle: a warm walnut galley runs along the left with a sink, brass gooseneck faucet, stovetop, green kettle, compact white fridge and open shelves with books and plants; on the right, a mustard channel-tufted dinette wraps a teal-topped table on a chrome pedestal, with patterned pillows, books and a mug. The window band carries cream curtains with a mustard-and-olive leaf print, the ceiling is white curved metal with seams and rivets, and the floor is oak plank with layered red and cream runners. At the rear, a raised platform bed has olive bedding, a striped throw and under-bed drawers, with shelving and framed art on the back wall. Keep all furniture, bedding, tableware and plants in their installed or resting positions, with no people and no motion. Preserve believable clearances and the strong depth of the reference. Deliver an editable .blend, a GLB, all local texture assets and a PNG preview rendered from the actual 3D scene. The final camera must match the reference image's position, viewing direction, framing and 3:2 aspect ratio.",
    demo: null,
    video: "assets/videos/09-pan-hd.mp4",
    model: "09",
    summary: "中古现代风（Mid-Century Modern）改装校车房车内部。沿狭长车厢由前向后依次组织料理台、卡座餐桌、收纳柜与尾端床铺，暖色木饰面与织物纹理层次分明。"
} ];
