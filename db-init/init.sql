-- PhoMenu Database Schema and Seed

-- Users table
CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language TEXT DEFAULT 'ru',
    subscription_plan TEXT DEFAULT 'free',
    balance DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dishes table
CREATE TABLE IF NOT EXISTS dishes (
    id SERIAL PRIMARY KEY,
    name_vi TEXT UNIQUE NOT NULL,
    description JSONB NOT NULL DEFAULT '{}',
    warnings JSONB NOT NULL DEFAULT '{}',
    allergens JSONB NOT NULL DEFAULT '{}',
    spice_level INTEGER DEFAULT 1 CHECK (spice_level >= 1 AND spice_level <= 5),
    price_range TEXT,
    search_tags TEXT[] DEFAULT '{}',
    image_urls TEXT[] DEFAULT '{}',
    is_moderated BOOLEAN DEFAULT FALSE,
    is_from_wiki BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waiter phrases (RAG source)
CREATE TABLE IF NOT EXISTS waiter_phrases (
    id SERIAL PRIMARY KEY,
    phrase_key TEXT UNIQUE NOT NULL,
    phrase_vi TEXT NOT NULL,
    translations JSONB NOT NULL DEFAULT '{}',
    category TEXT DEFAULT 'general',
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations (short-term memory)
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    dish_id INTEGER REFERENCES dishes(id) ON DELETE SET NULL,
    intent_category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions (last menu storage)
CREATE TABLE IF NOT EXISTS user_sessions (
    user_id BIGINT PRIMARY KEY,
    last_menu JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dishes_name_vi ON dishes(name_vi);
CREATE INDEX IF NOT EXISTS idx_dishes_moderated ON dishes(is_moderated);
CREATE INDEX IF NOT EXISTS idx_dishes_tags ON dishes USING GIN (search_tags);
CREATE INDEX IF NOT EXISTS idx_waiter_phrases_key ON waiter_phrases(phrase_key);
CREATE INDEX IF NOT EXISTS idx_waiter_phrases_category ON waiter_phrases(category);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);

-- Seed: Waiter Phrases
INSERT INTO waiter_phrases (phrase_key, phrase_vi, translations, category) VALUES
('no-sugar', 'Không đường', '{"ru": "Без сахара", "en": "No sugar", "kk": "Қантсыз", "uz": "Shakarsiz", "de": "Ohne Zucker", "fr": "Sans sucre"}', 'food'),
('no-cilantro', 'Không rau mùi', '{"ru": "Без кинзы", "en": "No cilantro", "kk": "Кинзасыз", "uz": "Kashnichsiz", "de": "Ohne Koriander", "fr": "Sans coriandre"}', 'food'),
('extra-noodles', 'Thêm mì', '{"ru": "Добавить лапши", "en": "Extra noodles", "kk": "Көбірек кәуап", "uz": "Ko''proq makaron", "de": "Mehr Nudeln", "fr": "Plus de nouilles"}', 'food'),
('more-soup', 'Thêm nước dùng', '{"ru": "Добавить бульон", "en": "More soup", "kk": "Көбірек сорпа", "uz": "Ko''proq sho''rva", "de": "Mehr Brühe", "fr": "Plus de bouillon"}', 'food'),
('less-spicy', 'Ít cay', '{"ru": "Менее острый", "en": "Less spicy", "kk": "Аз ашық", "uz": "Kam achchiq", "de": "Weniger scharf", "fr": "Moins épicé"}', 'food'),
('no-peanuts', 'Không đậu phộng', '{"ru": "Без арахиса", "en": "No peanuts", "kk": "Жержаңғақсыз", "uz": "Yog''lonsiz", "de": "Ohne Erdnüsse", "fr": "Sans cacahuètes"}', 'food'),
('extra-lime', 'Thêm chanh', '{"ru": "Добавить лайм", "en": "Extra lime", "kk": "Көбірек лайм", "uz": "Ko''proq laym", "de": "Mehr Limette", "fr": "Plus de citron vert"}', 'food'),
('no-onion', 'Không hành', '{"ru": "Без лука", "en": "No onion", "kk": "Пиязсыз", "uz": "Piyozsiz", "de": "Ohne Zwiebel", "fr": "Sans oignon"}', 'food'),
('extra-sauce', 'Thêm nước mắm', '{"ru": "Добавить рыбный соус", "en": "Extra fish sauce", "kk": "Балық соусын қосу", "uz": "Baliq sousini qo''shish", "de": "Mehr Fischsauce", "fr": "Plus de sauce de poisson"}', 'food'),
('less-salt', 'Ít mặn', '{"ru": "Менее солёный", "en": "Less salty", "kk": "Аз тұзды", "uz": "Kam tuzli", "de": "Weniger salzig", "fr": "Moins salé"}', 'food'),
('no-beansprouts', 'Không giá đỗ', '{"ru": "Без ростков", "en": "No bean sprouts", "kk": "Өскіншіксіз", "uz": "O''simliksiz", "de": "Ohne Sprossen", "fr": "Sans germes"}', 'food'),
('extra-tofu', 'Thêm đậu hủ', '{"ru": "Добавить тофу", "en": "Extra tofu", "kk": "Тофу қосу", "uz": "Tofuni qo''shish", "de": "Mehr Tofu", "fr": "Plus de tofu"}', 'food'),
('no-egg', 'Không trứng', '{"ru": "Без яйца", "en": "No egg", "kk": "Жұмыртқасыз", "uz": "Tuxumsiz", "de": "Ohne Ei", "fr": "Sans œuf"}', 'food'),
('extra-meat', 'Thêm thịt', '{"ru": "Добавить мяса", "en": "Extra meat", "kk": "Ет қосу", "uz": "Go''sht qo''shish", "de": "Mehr Fleisch", "fr": "Plus de viande"}', 'food'),
('no-scallion', 'Không hành lá', '{"ru": "Без зелёного лука", "en": "No scallion", "kk": "Жасыл пиязсыз", "uz": "Yashil piyozsiz", "de": "Ohne Frühlingszwiebel", "fr": "Sans ciboulette"}', 'food'),
('one-pho-bo', 'Một tô phở bò', '{"ru": "Одна порция фо бо", "en": "One pho bo", "kk": "Бір фо бо", "uz": "Bitta pho bo", "de": "Eine Pho Bo", "fr": "Un pho bo"}', 'order'),
('two-pho', 'Hai tô phở', '{"ru": "Две порции фо", "en": "Two bowls of pho", "kk": "Екі тос фо", "uz": "Ikki pho", "de": "Zwei Schalen Pho", "fr": "Deux bols de pho"}', 'order'),
('bill-please', 'Tính tiền', '{"ru": "Счёт, пожалуйста", "en": "Check please", "kk": "Есеп, өтініш", "uz": "Hisob, iltimos", "de": "Die Rechnung bitte", "fr": "L''addition s''il vous plaît"}', 'service'),
('water-please', 'Nước lạnh', '{"ru": "Воды, пожалуйста", "en": "Water please", "kk": "Су, өтініш", "uz": "Suv, iltimos", "de": "Wasser bitte", "fr": "De l''eau s''il vous plaît"}', 'service'),
('napkins', 'Khăn giấy', '{"ru": "Салфетки", "en": "Napkins", "kk": "Салфеткалар", "uz": "Salfetkalar", "de": "Servietten", "fr": "Serviettes"}', 'service'),
('more-chopsticks', 'Thêm đũa', '{"ru": "Ещё палочки", "en": "More chopsticks", "kk": "Таяқшалар", "uz": "Tayoqchalar", "de": "Mehr Stäbchen", "fr": "Plus de baguettes"}', 'service'),
('to-go', 'Mang về', '{"ru": "С собой", "en": "To go", "kk": "Алып кету", "uz": "Olib ketish", "de": "Zum Mitnehmen", "fr": "À emporter"}', 'service'),
('eat-here', 'Ăn tại đây', '{"ru": "Здесь", "en": "Eat here", "kk": "Жерде жеу", "uz": "Shu yerde yeyish", "de": "Hier essen", "fr": "Sur place"}', 'service'),
('clean-table', 'Dọn bàn', '{"ru": "Убрать со стола", "en": "Clean table", "kk": "Үстелді тазалау", "uz": "Stolni tozalash", "de": "Tisch aufräumen", "fr": "Nettoyer la table"}', 'service'),
('cafe-sua-da', 'Một ly cà phê sữa đá', '{"ru": "Один кафе суа да", "en": "One iced coffee", "kk": "Бір мұзды кофе", "uz": "Bitta muzli qahva", "de": "Ein Eiskaffee", "fr": "Un café glacé"}', 'drink'),
('tra-da', 'Một ly trà đá', '{"ru": "Один чай со льдом", "en": "One iced tea", "kk": "Бір мұзды шай", "uz": "Bitta muzli choy", "de": "Ein Eistee", "fr": "Un thé glacé"}', 'drink'),
('no-ice', 'Không đá', '{"ru": "Без льда", "en": "No ice", "kk": "Мұзсыз", "uz": "Muzsiz", "de": "Ohne Eis", "fr": "Sans glaçons"}', 'drink'),
('thank-you', 'Cảm ơn', '{"ru": "Спасибо", "en": "Thank you", "kk": "Рақмет", "uz": "Rahmat", "de": "Danke", "fr": "Merci"}', 'general'),
('delicious', 'Ngon quá', '{"ru": "Очень вкусно", "en": "Very delicious", "kk": "Өте дәмді", "uz": "Juda mazali", "de": "Sehr lecker", "fr": "Très délicieux"}', 'general'),
('sorry', 'Xin lỗi', '{"ru": "Извините", "en": "Sorry", "kk": "Кешіріңіз", "uz": "Kechiring", "de": "Entschuldigung", "fr": "Désolé"}', 'general'),
('goodbye', 'Tạm biệt', '{"ru": "До свидания", "en": "Goodbye", "kk": "Сау болыңыз", "uz": "Xayr", "de": "Auf Wiedersehen", "fr": "Au revoir"}', 'general'),
('help-me', 'Giúp tôi', '{"ru": "Помогите", "en": "Help me", "kk": "Маған көмектесіңіз", "uz": "Yordam bering", "de": "Helfen Sie mir", "fr": "Aidez-moi"}', 'general'),
('allergy-peanuts', 'Tôi dị ứng đậu phộng', '{"ru": "У меня аллергия на арахис", "en": "I''m allergic to peanuts", "kk": "Менде жержаңғақ аллергиясы", "uz": "Menda yong''in allergiyasi", "de": "Ich bin allergic gegen Erdnüsse", "fr": "Je suis allergic aux cacahuètes"}', 'food'),
('allergy-shellfish', 'Tôi dị ứng tôm cua', '{"ru": "У меня аллергия на морепродукты", "en": "I''m allergic to shellfish", "kk": "Менде теңіз өнімдері аллергиясы", "uz": "Menda dengiz mahsulotlari allergiyasi", "de": "Ich bin allergic gegen Schalentiere", "fr": "Je suis allergic aux crustacés"}', 'food')
ON CONFLICT (phrase_key) DO NOTHING;

-- Seed: Dishes (description/warnings as {lang: "text"}, allergens as {lang: [array]})
INSERT INTO dishes (name_vi, description, warnings, allergens, spice_level, price_range, search_tags, is_moderated) VALUES
('Phở Bò',
 '{"vi": "Phở Bò - Thoang thoang mui huong que xa, nuoc dung dam da ngot ngon", "ru": "Фо Бо — это душа Вьетнама в одной чаше. Представьте: вы сидите на маленьком стульчике в Ханое, а перед вами дымится густой, прозрачный бульон, который варился 12 часов с корицей и бадьяном. Нежнейшие слайсы говядины тают на языке, оставляя послевкусие колониальной эпохи.", "en": "Pho Bo — the soul of Vietnam in a single bowl. Imagine sitting on a tiny stool in Hanoi, with a steaming, crystal-clear broth simmered for 12 hours with cinnamon and star anise. Tender beef slices melt on your tongue, leaving a lingering taste of colonial history."}',
 '{"ru": ["Бульон очень горячий"], "en": ["Broth is very hot"]}',
 '{"ru": ["говядина"], "en": ["beef"]}', 1, '65,000 - 95,000 VND', '{phở,bò,súp,nước,thịt}', TRUE),

('Phở Gà',
 '{"vi": "Phở Gà - Nuoc dung trong veo, thom thoang mui hoa", "ru": "Фо Га — изысканная альтернатива для тех, кто ищет легкости. Прозрачный, как утренняя роса, куриный бульон с ароматом свежего имбиря. Это блюдо — как тихий рассвет над заливом Халонг: спокойное, чистое и невероятно глубокое.", "en": "Pho Ga — an elegant alternative for those seeking lightness. Crystal-clear chicken broth, fragrant with fresh ginger. This dish is like a quiet sunrise over Halong Bay: calm, pure, and incredibly deep."}',
 '{}', '{}', 1, '55,000 - 85,000 VND', '{phở,gà,súp,nước,thịt}', TRUE),

('Bún Bò Huế',
 '{"vi": "Bún Bò Huế - Cay xè lưỡi! Nuoc dung do dam mam manh", "ru": "Бун Бо Хюэ — это дерзкий вызов вашим чувствам из древней столицы. Острый, пряный, с мощным аккордом лемонграсса и ферментированного соуса. Это гастрономическое путешествие в самое сердце императорского Вьетнама, где каждый глоток — это взрыв вкуса.", "en": "Bun Bo Hue — a bold challenge to your senses from the ancient capital. Spicy, fragrant, with a powerful chord of lemongrass and fermented sauce. A gastronomic journey to the heart of imperial Vietnam, where every sip is an explosion of flavor."}',
 '{"ru": ["Очень острое", "Содержит кровяную колбасу"], "en": ["Very spicy", "Contains congealed pig blood"]}',
 '{}', 5, '70,000 - 110,000 VND', '{bún,bò,huế,cay,súp,nước}', TRUE),

('Bún Chả',
 '{"vi": "Bún Chả - Bàn ăn mùa hè! Tô bun lạnh, miếng cha nuong thơm lừng", "ru": "Бун Ча — любимый обед Ханоя. Аромат свинины, поджаренной на углях, смешивается со свежестью зелени и прохладой рисовой лапши. Окуните мясо в кисло-сладкий соус и почувствуйте ритм оживленных улиц, замерших в ожидании трапезы.", "en": "Bun Cha — Hanoi''s favorite lunch. The aroma of charcoal-grilled pork mingles with fresh herbs and cool rice noodles. Dip the meat into the sweet and sour sauce and feel the rhythm of bustling streets pausing for a meal."}',
 '{}', '{}', 2, '60,000 - 90,000 VND', '{bún,chả,thịt,nướng,lợn,heo}', TRUE),

('Bánh Mì',
 '{"vi": "Bánh Mì - Vietnamesisches Brot! Vỏ bánh giòn tan", "ru": "Бан Ми — величайший симбиоз Востока и Запада. Хрустящий французский багет, наполненный вьетнамским паштетом, маринованными овощами и кинзой. Это идеальный перекус для исследователя, который не привык останавливаться на достигнутом.", "en": "Banh Mi — the ultimate symbiosis of East and West. A crispy French baguette filled with Vietnamese pate, pickled vegetables, and cilantro. The perfect snack for an explorer who never stops."}',
 '{}', '{"ru": ["глютен"], "en": ["gluten"]}', 2, '25,000 - 55,000 VND', '{bánh,mì,kẹp,thịt,pate}', TRUE),

('Gỏi Cuốn',
 '{"vi": "Gỏi Cuốn - Những cuốn tươi mát như suối!", "ru": "Гой Куон — сама свежесть, завернутая в прозрачную рисовую бумагу. Сквозь нее, как через витрину, видны розовые креветки и изумрудная зелень. Это легкий бриз с Южно-Китайского моря, воплощенный в еде.", "en": "Goi Cuon — freshness itself, wrapped in transparent rice paper. Through it, like a display window, you can see pink shrimp and emerald greens. A light breeze from the South China Sea, embodied in food."}',
 '{}', '{"ru": ["креветки"], "en": ["shrimp"]}', 1, '40,000 - 70,000 VND', '{gỏi,cuốn,tôm,thịt,rau}', TRUE),

('Nem Rán',
 '{"vi": "Nem Rán - Vàng giòn đét!", "ru": "Нем Ран — золотистое искушение. Хрустящая оболочка скрывает сочную начинку из мяса и древесных грибов. Каждый укус — это праздник текстур, который лучше всего дополняется классическим соусом Нуок Мам.", "en": "Nem Ran — a golden temptation. The crispy shell hides a juicy filling of meat and wood ear mushrooms. Every bite is a celebration of textures, best complemented by the classic Nuoc Mam sauce."}',
 '{}', '{}', 2, '50,000 - 80,000 VND', '{nem,rán,chả,giò,thịt,lợn}', TRUE),

('Cơm Tấm',
 '{"vi": "Cơm Tấm - Cơm ta mẹ! Những hạt cơm gãy không đều", "ru": "Ком Там — «дробленый рис», еда простых людей, ставшая легендой. Подается с нежной свиной отбивной на гриле и яичным паштетом. Это вкус настоящего Сайгона, честный, сытный и бесконечно гостеприимный.", "en": "Com Tam — ''broken rice'', the food of common folk that became a legend. Served with a tender grilled pork chop and egg meatloaf. The taste of real Saigon: honest, hearty, and infinitely welcoming."}',
 '{}', '{}', 2, '55,000 - 95,000 VND', '{cơm,tấm,sườn,thịt,nướng}', TRUE),

('Cà Phê Sữa Đá',
 '{"vi": "Cà Phê Sữa Đá - Nguoi phien ban Viet!", "ru": "Кафе Суа Да — вьетнамский ритуал в стакане. Густой, почти шоколадный кофе медленно капает в сгущенное молоко, а затем встречается с горой льда. Это топливо для тех, кто готов покорять джунгли или мегаполисы.", "en": "Ca Phe Sua Da — a Vietnamese ritual in a glass. Thick, almost chocolatey coffee slowly drips into condensed milk, then meets a mountain of ice. Fuel for those ready to conquer jungles or metropolises."}',
 '{"ru": ["Очень крепкий кофеин"], "en": ["Very strong caffeine"]}',
 '{"ru": ["лактоза"], "en": ["lactose"]}', 1, '30,000 - 60,000 VND', '{cà,phê,sữa,đá,uống}', TRUE),

('Bánh Xèo',
 '{"vi": "Bánh Xèo - Cai giòn dap ú a!", "ru": "Бан Сео — «шипящий блин». Золотистая корочка с ароматом куркумы, внутри которой прячутся креветки и ростки маша. Заверните кусочек в лист салата with травами — это квинтэссенция вьетнамского стиля еды.", "en": "Banh Xeo — the ''sizzling pancake''. A golden crust fragrant with turmeric, hiding shrimp and bean sprouts inside. Wrap a piece in a lettuce leaf with herbs — the quintessence of Vietnamese dining style."}',
 '{}', '{"ru": ["креветки"], "en": ["shrimp"]}', 2, '70,000 - 120,000 VND', '{bánh,xèo,tôm,thịt,giá}', TRUE),

('Bún Rêu',
 '{"vi": "Bún Rêu - Huong vi cua dong", "ru": "Бун Рё — деревенская сказка в тарелке. Томатный бульон with нежным крабовым паштетом и кубиками тофу. Этот суп перенесет вас на рисовые поля дельты Меконга, где жизнь течет размеренно и вкусно.", "en": "Bun Rieu — a rustic fairy tale in a bowl. Tomato-based broth with delicate crab paste and tofu cubes. This soup transports you to the rice paddies of the Mekong Delta, where life flows steadily and deliciously."}',
 '{}', '{"ru": ["краб", "моллюски"], "en": ["crab", "shellfish"]}', 3, '50,000 - 80,000 VND', '{bún,riêu,cua,ốc,súp,nước}', TRUE),

('Mì Quảng',
 '{"vi": "Mì Quảng - Dac san Quang Nam", "ru": "Ми Куанг — яркая палитра региона Куангнам. Широкая рисовая лапша, окрашенная куркумой, с небольшим количеством концентрированного бульона, перепелиными яйцами и хрустящими крекерами. Настоящий арт-объект на вашем столе.", "en": "Mi Quang — a vibrant palette from the Quang Nam region. Wide turmeric-stained rice noodles with a small amount of concentrated broth, quail eggs, and crispy crackers. A true art object on your table."}',
 '{}', '{"ru": ["арахис"], "en": ["peanuts"]}', 2, '60,000 - 90,000 VND', '{mì,quảng,tôm,thịt,trứng}', TRUE),

('Chả Cá Lã Vọng',
 '{"vi": "Chả Cá Lã Vọng - Nghe thuat am thuc Ha Noi", "ru": "Ча Ка Ла Вонг — легенда Ханоя. Кусочки рыбы, маринованные в галангале и куркуме, обжариваются прямо при вас с горой свежего укропа и зеленого лука. Это не просто еда, это спектакль, в котором вы — главный герой.", "en": "Cha Ca La Vong — a Hanoi legend. Pieces of fish marinated in galangal and turmeric, grilled right before you with a mountain of fresh dill and green onions. Not just food, but a performance where you are the lead."}',
 '{}', '{"ru": ["рыба", "арахис"], "en": ["fish", "peanuts"]}', 1, '150,000 - 250,000 VND', '{chả,cá,lã,vọng,thì,là}', TRUE),

('Bánh Cuốn',
 '{"vi": "Bánh Cuốn - Mem mai nhu lua", "ru": "Бан Куон — нежность шелка. Тончайшие паровые блинчики из рисовой муки with начинкой из свинины и грибов, посыпанные хрустящим жареным луком. Завтрак, который заставляет улыбнуться новому дню.", "en": "Banh Cuon — the tenderness of silk. Paper-thin steamed rice crepes filled with minced pork and mushrooms, topped with crispy fried shallots. A breakfast that makes you smile at the new day."}',
 '{}', '{}', 1, '40,000 - 70,000 VND', '{bánh,cuốn,thịt,mộc,nhĩ}', TRUE),

('Bún Đậu Mắm Tôm',
 '{"vi": "Bún Đậu Mắm Tôm - Thach thuc vi giac", "ru": "Бун Дау Мам Том — выбор смелых гурманов. Рисовая лапша, жареный тофу и свинина, которые окунаются в резкий, ферментированный креветочный соус. Это вкус, который либо ненавидят, либо любят до беспамятства. А на чьей стороне вы?", "en": "Bun Dau Mam Tom — the choice of bold gourmets. Rice noodles, fried tofu, and pork dipped in a pungent, fermented shrimp sauce. A taste you either hate or love passionately. Which side are you on?"}',
 '{"ru": ["Очень резкий запах соуса"], "en": ["Very strong sauce smell"]}',
 '{"ru": ["креветки"], "en": ["shrimp"]}', 3, '60,000 - 100,000 VND', '{bún,đậu,mắm,tôm,thịt}', TRUE),

('Cao Lầu',
 '{"vi": "Cao Lầu - Bi an Hoi An", "ru": "Као Лау — загадка древнего Хойана. Уникальная толстая лапша, секрет приготовления которой хранится веками. Слайсы свинины ча-сю и хрустящие гренки в окружении свежих трав. Вкус, который невозможно повторить за пределами этого города.", "en": "Cao Lau — the mystery of ancient Hoi An. Unique thick noodles, the secret of which has been kept for centuries. Char siu pork slices and crispy croutons surrounded by fresh herbs. A taste impossible to replicate outside this city."}',
 '{}', '{}', 2, '50,000 - 80,000 VND', '{cao,lầu,thịt,xá,xíu,hội,an}', TRUE),

('Lẩu Thái',
 '{"vi": "Lẩu Thái - Tiec tung ben noi lau", "ru": "Лау Тхай — вьетнамское прочтение тайского хот-пота. Кисло-острый бульон, в котором вы сами готовите морепродукты, мясо и овощи. Это символ дружбы и долгих разговоров под шум тропического дождя.", "en": "Lau Thai — a Vietnamese take on the Thai hot pot. A sour and spicy broth where you cook seafood, meat, and vegetables yourself. A symbol of friendship and long conversations under the sound of tropical rain."}',
 '{"ru": ["Острое"], "en": ["Spicy"]}',
 '{"ru": ["морепродукты"], "en": ["seafood"]}', 4, '250,000 - 500,000 VND', '{lẩu,thái,tôm,mực,bò,rau}', TRUE),

('Chè Ba Màu',
 '{"vi": "Chè Ba Màu - Mau sac nhiet đoi", "ru": "Че Ба Мау — «трехцветный десерт». Слои бобов, желе и кокосового молока со льдом. Это яркий карнавал красок и вкусов, идеальное завершение жаркого дня в тропиках.", "en": "Che Ba Màu — the ''three-color dessert''. Layers of beans, jelly, and coconut milk with ice. A vibrant carnival of colors and flavors, the perfect end to a hot tropical day."}',
 '{}', '{}', 1, '25,000 - 45,000 VND', '{chè,ba,màu,ngọt,đá,đỗ}', TRUE),

('Bún Thịt Nướng',
 '{"vi": "Bún Thịt Nướng - Huong vi mien Nam", "ru": "Бун Тхит Ныонг — южная классика. Рисовая лапша with ароматной свининой-гриль, весенним роллом и обилием зелени. Все это поливается соусом Нуок Мам, создавая идеальный баланс сладкого, соленого и свежего.", "en": "Bun Thit Nuong — a Southern classic. Rice noodles with fragrant grilled pork, a spring roll, and plenty of herbs. Drizzled with Nuoc Mam sauce, it creates a perfect balance of sweet, salty, and fresh."}',
 '{}', '{"ru": ["арахис"], "en": ["peanuts"]}', 2, '55,000 - 85,000 VND', '{bún,thịt,nướng,chả,giò}', TRUE),

('Bánh Khọt',
 '{"vi": "Bánh Khọt - Nhung chiec banh nho xinh", "ru": "Бан Кхот — миниатюрные хрустящие оладьи with креветкой сверху. Они как маленькие сокровища, которые нужно заворачивать в листья салата. Хруст, сочность и нежность в каждом маленьком кружочке.", "en": "Banh Khot — miniature crispy pancakes topped with a shrimp. They are like little treasures to be wrapped in lettuce leaves. Crunch, juiciness, and tenderness in every small circle."}',
 '{}', '{"ru": ["креветки"], "en": ["shrimp"]}', 2, '60,000 - 100,000 VND', '{bánh,khọt,tôm,chiên,giòn}', TRUE)
ON CONFLICT (name_vi) DO NOTHING;
