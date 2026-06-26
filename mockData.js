const DANGRO_MOCK_DATA = {
  servers: [
    {
      id: "dangro-hq",
      name: "Dangro HQ",
      icon: "D",
      channels: [
        { id: "general", name: "general" },
        { id: "announcements", name: "announcements" },
        { id: "memes", name: "memes" },
        { id: "dev-chat", name: "dev-chat" }
      ]
    },
    {
      id: "gamers-sanctuary",
      name: "Gamers Sanctuary",
      icon: "G",
      channels: [
        { id: "lobby", name: "lobby" },
        { id: "clips", name: "clips" },
        { id: "hardware-talk", name: "hardware-talk" }
      ]
    },
    {
      id: "creative-lounge",
      name: "Creative Lounge",
      icon: "C",
      channels: [
        { id: "art-gallery", name: "art-gallery" },
        { id: "music-vibes", name: "music-vibes" },
        { id: "writing", name: "writing" }
      ]
    }
  ],

  friends: [
    {
      id: "pixel_alex",
      username: "pixel_alex",
      discriminator: "4829",
      status: "online",
      customStatus: "Coding in JavaScript...",
      avatarColor: "#555555",
      profilePic: ""
    },
    {
      id: "cyber_sam",
      username: "cyber_sam",
      discriminator: "1932",
      status: "idle",
      customStatus: "AFK grabbing coffee",
      avatarColor: "#444444",
      profilePic: ""
    },
    {
      id: "neon_lisa",
      username: "neon_lisa",
      discriminator: "7721",
      status: "dnd",
      customStatus: "In a deep state of flow",
      avatarColor: "#666666",
      profilePic: ""
    },
    {
      id: "ghost_rider",
      username: "ghost_rider",
      discriminator: "9901",
      status: "offline",
      customStatus: "",
      avatarColor: "#333333",
      profilePic: ""
    },
    {
      id: "retro_gamer",
      username: "retro_gamer",
      discriminator: "5504",
      status: "online",
      customStatus: "Playing Retro City",
      avatarColor: "#555555",
      profilePic: ""
    },
    {
      id: "syntax_sage",
      username: "syntax_sage",
      discriminator: "3342",
      status: "online",
      customStatus: "Reviewing PRs",
      avatarColor: "#444444",
      profilePic: ""
    }
  ],

  groupChats: [],

  initialMessages: {
    "dangro-hq_general": [
      { id: "m1", sender: "pixel_alex", content: "Welcome to Dangro HQ! Excited to build this awesome chat interface.", timestamp: "Today at 5:12 PM", reactions: {}, replyTo: null },
      { id: "m2", sender: "cyber_sam", content: "The resizable panel layout is so smooth. Love the clean design.", timestamp: "Today at 5:14 PM", reactions: {}, replyTo: null },
      { id: "m3", sender: "neon_lisa", content: "Did anyone check out the YouTube/Instagram simulator on the left?", timestamp: "Today at 5:15 PM", reactions: {}, replyTo: null }
    ],
    "dangro-hq_announcements": [
      { id: "a1", sender: "System", content: "Welcome to Dangro! Chat, share, and connect.", timestamp: "Yesterday at 12:00 PM", system: true, reactions: {}, replyTo: null }
    ],
    "dangro-hq_memes": [
      { id: "me1", sender: "retro_gamer", content: "Me after designing a CSS grid that actually works on the first try:", timestamp: "Today at 3:30 PM", reactions: {}, replyTo: null },
      { id: "me2", sender: "pixel_alex", content: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&q=80", timestamp: "Today at 3:32 PM", isImage: true, reactions: {}, replyTo: null }
    ],
    "dangro-hq_dev-chat": [
      { id: "dc1", sender: "pixel_alex", content: "Anyone working on the new features today?", timestamp: "Today at 2:00 PM", reactions: {}, replyTo: null }
    ],
    "dm_pixel_alex": [
      { id: "dm1", sender: "pixel_alex", content: "Hey! Let me know if you want to test out some code changes.", timestamp: "Today at 4:00 PM", reactions: {}, replyTo: null }
    ],
    "dm_cyber_sam": [
      { id: "dm2", sender: "cyber_sam", content: "Hey there, did you finish the new features?", timestamp: "Today at 10:15 AM", reactions: {}, replyTo: null }
    ],
    "dm_neon_lisa": [
      { id: "dm3", sender: "neon_lisa", content: "Hi! Love the new design updates!", timestamp: "Today at 11:30 AM", reactions: {}, replyTo: null }
    ],
    "dm_retro_gamer": [
      { id: "dm4", sender: "retro_gamer", content: "GG! Want to play something later?", timestamp: "Today at 1:00 PM", reactions: {}, replyTo: null }
    ]
  },

  youtubeVideos: [
    {
      id: "dQw4w9WgXcQ",
      title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
      channelName: "Rick Astley",
      views: "1.4B views",
      likes: "17M likes",
      thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "jfKfPfyJRdk",
      title: "lofi hip hop radio - beats to relax/study to",
      channelName: "Lofi Girl",
      views: "68M views",
      likes: "2.3M likes",
      thumbnail: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "2g811Eo7K8U",
      title: "Modern Web Design Aesthetics - CSS Secrets",
      channelName: "AestheticCodes",
      views: "154K views",
      likes: "12K likes",
      thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=400&q=80"
    }
  ],

  instagramPosts: [
    {
      id: "ig1",
      username: "design_inspiration",
      userAvatarColor: "#555555",
      image: "https://images.unsplash.com/photo-1541462608141-2f5287b4e93d?auto=format&fit=crop&w=500&q=80",
      likes: 1243,
      caption: "Clean dashboard concepts. Minimalist, functional. What do you think? #uidesign #minimal",
      liked: false,
      comments: [
        { username: "pixel_craft", text: "Wow, the colors are amazing!" },
        { username: "ux_lily", text: "Love the clean design." }
      ]
    },
    {
      id: "ig2",
      username: "setup_goals",
      userAvatarColor: "#444444",
      image: "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=500&q=80",
      likes: 852,
      caption: "Late night coding session. Clean vibes only! Rate this setup 1-10.",
      liked: true,
      comments: [
        { username: "coder_dan", text: "Solid 10/10, keyboard specs?" },
        { username: "neon_vibes", text: "That setup is perfect." }
      ]
    }
  ],
  
  emojis: [
    "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","😡","😠","🤬","👍","👎","👊","✊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✌️","🤟","🤘","👌","💪","💄","💋","👄","👅","👀","🧠","👑","🎒","👝","👛","👜","💼","🎓","👓","🕶️","🌍","🌎","🌏","🌐","🗺️","🏔️","⛰️","🌋","🏜️","🏝️","🏖️","🌅","🌄","🌠","🎇","🎆","🌇","🌆","🏙️","🌃","🌌","🌉","🌈","⛄","🔥","💧","🌊","💫","⭐","🌟","✨","⚡","☄️","💥","💦","💨","🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🍞","🥖","🥨","🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🥪","🥙","🧆","🌮","🌯","🥗","🥘","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🥛","🍼","☕","🫖","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🫗","🥃","🍸","🍹","🍾","🥄","🍴","🍽️","🥣","🥡","🥢","🧂","🎵","🎶","🎧","🎤","🎸","🎹","🥁","🎷","🎺","🎻","🎬","🎭","🎨","🎪","🎟️","🎫","🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️","🎪","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🎻","🎲","♟️","🎯","🎳","🎮","🕹️","🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵","🛺","🚲","🛴","🛹","🚨","🚔","🚍","🚘","🚖","🚡","🚠","🚟","🚃","🚞","🚝","🚄","🚅","🚈","🚂","✈️","🛫","🛬","🛩️","💺","🛰️","🚀","🛸","🏠","🏡","🏘️","🏚️","🏗️","🏢","🏬","🏣","🏤","🏥","🏦","🏪","🏫","🏩","💒","🏛️","⛪","🕌","🕍","🛕","🕋","⛩️","🛤️","🛣️","🗾","🎠","🎡","🎢","🛝","🎪","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🎻","🎲","♟️","🎯","🎳","🎮","🕹️","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💞","💗","💖","💘","💝","💟","❣️","💌","💔","🔥","⭐","🌟","✨","💫","🎉","🎊","🎈","🎁","🎀","🪄","🪅","🪆","🎭","🎨","🖼️","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🎻","🎲","♟️","🎯","🎳","🎮","🕹️","👻","☠️","💀","👽","👾","🤖","🎃","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖","🎃","😈","👹","👺","🤡","💩","🦴","👁️","👂","👃","👣","👅","👄","💋","👓","🕶️","👔","👕","👖","🧣","🧤","🧥","🧦","👗","👘","🥻","🩱","🩲","🩳","👙","👚","👛","👜","👝","🎒","👞","👟","🥾","🥿","👠","👡","👢","👑","👒","🎩","🎓","🧢","⛑️","💄","💍","🌂","🧳","☂️","💼","🎒","👝","👛","👜","💄","💍","💎","📱","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯️","🗑️","🛢️","💸","💵","💴","💶","💷","💰","💳","💎","⚖️","🔧","🔨","⚒️","🛠️","⛏️","🔩","⚙️","🗜️","🔫","💣","🔪","🗡️","⚔️","🛡️","🚬","⚰️","🪦","⚱️","🏺","🔮","📿","💈","⚗️","🔭","🔬","🕳️","💊","💉","🩸","🩹","🩺","🩻","🌡️","🧬","🦠","🧫","🧪","🧴","🧷","🧹","🧺","🧻","🪣","🪥","🪒","🪮","🧵","🪡","🧶","🪢","🔑","🗝️","🚪","🪑","🛏️","🛋️","🪟","🛁","🛀","🚿","🪞","🪥","🪒","🧴","🧹","🧺","🧻","🪣","🪥","🪒","🪮","🧷","🧵","🪡","🧶","🪢","🔑","🗝️","🚪","🪑","🛏️","🛋️","🪟","🛁","🛀","🚿","🪞","📚","📖","📕","📗","📘","📙","📔","📓","📒","📃","📜","📄","📰","🗞️","🔖","🏷️","💰","💴","💵","💶","💷","💸","💳","🧾","✉️","📧","📨","📩","📤","📥","📦","📪","📫","📬","📭","📮","🗳️","✏️","✒️","🖊️","🖌️","🖍️","📝","📎","🖇️","📐","📏","🧮","✂️","🗃️","🗄️","🗑️","🔒","🔓","🔏","🔐","🔑","🗝️","🔨","🪓","⛏️","⚒️","🛠️","🔧","🔩","⚙️","🗜️","🔫","💣","🔪","🗡️","⚔️","🛡️","🚬","⚰️","🪦","⚱️","🏺","🔮","📿","💈","⚗️","🔭","🔬","🕳️","💊","💉","🩸","🩹","🩺","🩻","🌡️","🧬","🦠","🧫","🧪","🧴","🧷","🧹","🧺","🧻","🪣","🪥","🪒","🪮","🧵","🪡","🧶","🪢","🔑","🗝️","🚪","🪑","🛏️","🛋️","🪟","🛁","🛀","🚿","🪞","🚽","🪠","🪤","🧲","🧴","🧷","🧹","🧺","🧻","🪣","🪥","🪒","🪮","🧵","🪡","🧶","🪢","🪴","🌸","💮","🏵️","🌹","🥀","🌺","🌻","🌼","🌷","🌱","🌿","☘️","🍀","🍃","🍂","🍁","🪺","🪹","🪷","🌾","💐","🌲","🌳","🌴","🌵","🌾","🌿","☘️","🍀","🍁","🍂","🍃","🪹","🪺","🪴","🌵","🌴","🌳","🌲","🌱","🌿","☘️","🍀","🍁","🍂","🍃","🌾","💐","🌸","🌹","🌺","🌻","🌼","🌷","🪷","🪻","🌷","🌹","🥀","🌺","🌻","🌼","🌷","🪷","🪻","🌸","💮","🏵️","🌹","🥀","🌺","🌻","🌼","🌷","🌱","🌿","☘️","🍀","🍁","🍂","🍃","🪹","🪺","🪴","🌵","🌴","🌳","🌲","🌾","💐","🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🪳","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🪸","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐕‍🦺","🐈","🐈‍⬛","🪶","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔","🐾","🐉","🐲","🌵","🎄","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🎋","🍃","🎍","🍄","🐚","🪨","🌾","💐","🌷","🌹","🥀","🌺","🌻","🌼","🌸","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌎","🌍","🌏","🪐","💫","⭐","🌟","✨","⚡","☄️","💥","🔥","🌪️","🌈","☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌬️","💨","💧","💦","🫧","☔","☂️","🌊","🌫️","🎃","🎄","🎆","🎇","🧨","✨","🎈","🎉","🎊","🎁","🎗️","🎞️","🎟️","🎫","🎖️","🏆","🏅","🥇","🥈","🥉","⚽","⚾","🥎","🏀","🏐","🏈","🏉","🎾","🥏","🎳","🏏","🏑","🏒","🥍","🏓","🏸","🏹","🎣","🤿","🥊","🥋","🎿","⛷️","🏂","🪂","🏋️","🤼","🤸","🤺","⛹️","🤾","🏌️","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚴","🏋️","🏌️","🤺","🤼","🤸","🤾","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚴","🏋️‍♂️","🏋️‍♀️","🏌️‍♂️","🏌️‍♀️","🤸‍♂️","🤸‍♀️","🤾‍♂️","🤾‍♀️","🏇","🧘‍♂️","🧘‍♀️","🏄‍♂️","🏄‍♀️","🏊‍♂️","🏊‍♀️","🤽‍♂️","🤽‍♀️","🚣‍♂️","🚣‍♀️","🧗‍♂️","🧗‍♀️","🚴‍♂️","🚴‍♀️","🚵‍♂️","🚵‍♀️","🏂","🪂","🏋️","🤼","🤸","🤺","🤾","🏌️","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚴","🚵","🎪","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🎻","🎲","♟️","🎯","🎳","🎮","🕹️","🎰","🚣","🗣️","👤","👥","🫂","👪","👨‍👩‍👧‍👦","👩‍👩‍👧‍👦","👨‍👨‍👧‍👦","👩‍👦","👨‍👦","👩‍👧","👨‍👧","👶","👧","🧒","👦","👩","🧑","👨","👩‍🦱","🧑‍🦱","👨‍🦱","👩‍🦰","🧑‍🦰","👨‍🦰","👩‍🦳","🧑‍🦳","👨‍🦳","👩‍🦲","🧑‍🦲","👨‍🦲","🧔","🧔‍♂️","🧔‍♀️","👴","👵","🧓","👲","👳‍♂️","👳‍♀️","🧕","👮‍♂️","👮‍♀️","👷‍♂️","👷‍♀️","💂‍♂️","💂‍♀️","🕵️‍♂️","🕵️‍♀️","👩‍💻","🧑‍💻","👨‍💻","👩‍💼","🧑‍💼","👨‍💼","👩‍🔧","🧑‍🔧","👨‍🔧","👩‍🔬","🧑‍🔬","👨‍🔬","👩‍🎨","🧑‍🎨","👨‍🎨","👩‍🚒","🧑‍🚒","👨‍🚒","👩‍✈️","🧑‍✈️","👨‍✈️","👩‍🚀","🧑‍🚀","👨‍🚀","👩‍⚖️","🧑‍⚖️","👨‍⚖️","👰‍♂️","👰‍♀️","🤵‍♂️","🤵‍♀️","👸","🤴","🫅","🦸‍♂️","🦸‍♀️","🦹‍♂️","🦹‍♀️","🧙‍♂️","🧙‍♀️","🧝‍♂️","🧝‍♀️","🧛‍♂️","🧛‍♀️","🧟‍♂️","🧟‍♀️","🧞‍♂️","🧞‍♀️","🧜‍♂️","🧜‍♀️","🧚‍♂️","🧚‍♀️","👼","🤰","🫃","🫄"
  ]
};
