import type { Locale } from "@game/lib/i18n";
import { SEO_PAGES } from "@/app/lib/seo/pages";
import { siteConfig } from "@/app/lib/seo/site-config";

// SEO-тексти сайту (title/description головної й сторінок) усіма мовами гри - для розділу
// адмінки "Переклади" → SEO. Англійська - ті самі тексти, що в buildMetadata (pages.ts);
// правки з адмінки лежать у Firestore translations/{locale}.seo під тими самими ключами.
// Сайт поки має лише англійські адреси, тож інші мови тут - готовий переклад на майбутні /uk/, /de/...

export const seoKey = (path: string, field: "title" | "description"): string => `page:${path}:${field}`;

export const SEO_EN: Record<string, string> = {
    "site:title": `${siteConfig.name} - Play Free, No Download`,
    "site:description": siteConfig.description,
    ...Object.fromEntries(SEO_PAGES.flatMap((page) => [[seoKey(page.path, "title"), page.title], [seoKey(page.path, "description"), page.description]])),
};

// Підпис рядка в адмінці: шлях сторінки й поле.
export const seoLabel = (key: string): string => {
    if (key === "site:title") return "Сайт · title";
    if (key === "site:description") return "Сайт · description";
    const [, path, field] = key.split(":");
    return `${path} · ${field}`;
};

type PageTexts = Record<string, [string, string]>;

const build = (site: [string, string], pages: PageTexts): Record<string, string> => ({
    "site:title": site[0],
    "site:description": site[1],
    ...Object.fromEntries(Object.entries(pages).flatMap(([path, [title, description]]) => [[seoKey(path, "title"), title], [seoKey(path, "description"), description]])),
});

export const SEO_TRANSLATIONS: Record<Exclude<Locale, "en">, Record<string, string>> = {
    uk: build(
        [
            "Tic Tac Toe Online - грай безкоштовно, без завантаження",
            "Хрестики-нулики онлайн безкоштовно: перевір сили з розумним ботом, зіграй з другом на одному пристрої або змагайся в мультиплеєрі в реальному часі. Без завантаження й реєстрації.",
        ],
        {
            "/": ["Хрестики-нулики онлайн - безкоштовно, без завантаження", "Грай у хрестики-нулики онлайн безкоштовно. Змагайся з розумним ботом, клич друга за посиланням або грай у мультиплеєрі в реальному часі - без завантаження й реєстрації."],
            "/play-vs-ai": ["Хрестики-нулики з ботом - безкоштовний суперник", "Кинь виклик розумному боту в хрестики-нулики. Обери класичний режим або складніше гіга-поле - без завантаження й реєстрації."],
            "/play-vs-friend": ["Хрестики-нулики з другом онлайн - посилання-запрошення", "Запроси друга зіграти в хрестики-нулики онлайн у реальному часі. Створи кімнату, поділися посиланням і грайте з будь-яких двох пристроїв - безкоштовно, без реєстрації."],
            "/multiplayer": ["Хрестики-нулики мультиплеєр - матчі онлайн у реальному часі", "Грай у хрестики-нулики онлайн у реальному часі. Кімнати миттєво синхронізуються між пристроями, тож кожен хід видно одразу."],
            "/how-to-play": ["Як грати в хрестики-нулики - посібник для новачків", "Простий покроковий посібник: як ходять гравці, як виграти і як грати з ботом, з другом і в мультиплеєрі на цьому сайті."],
            "/tic-tac-toe-rules": ["Правила хрестиків-ноликів - офіційні правила й FAQ", "Повні правила хрестиків-ноликів і відповіді на часті питання: хто ходить першим, що буває при нічиї, і правила гіга-поля."],
            "/daily-challenge": ["Виклик дня в хрестиках-ноликах", "Щодня нова головоломка в хрестики-нулики. Поки ми допрацьовуємо виклик дня, грай звичайну гру з ботом, з друзями або онлайн."],
            "/leaderboard": ["Таблиця лідерів хрестиків-ноликів", "Скоро - світова таблиця лідерів хрестиків-ноликів за перемогами з ботом, з друзями й у мультиплеєрі. Ось що заплановано."],
            "/blog": ["Блог - стратегія, історія хрестиків-ноликів і браузерні ігри", "Посібники зі стратегії, пояснення про ботів, історія хрестиків-ноликів і статті про найкращі браузерні та HTML5-ігри."],
            "/about": ["Про Tic Tac Toe Online", "Tic Tac Toe Online - безкоштовна браузерна гра без завантаження з режимами проти бота, з другом і мультиплеєром у реальному часі. Що ми робимо і навіщо."],
            "/contact": ["Контакти", "Напиши команді Tic Tac Toe Online - відгуки, повідомлення про помилки й питання щодо реклами."],
            "/privacy": ["Політика конфіденційності", "Як Tic Tac Toe Online збирає, використовує й захищає твої дані."],
            "/terms": ["Умови використання", "Умови, за якими ти користуєшся Tic Tac Toe Online."],
        }
    ),
    fr: build(
        [
            "Tic Tac Toe Online - Jouez gratuitement, sans téléchargement",
            "Jouez au morpion en ligne gratuitement : défiez une IA maligne, jouez avec un ami sur le même appareil ou affrontez d'autres joueurs en multijoueur en temps réel. Sans téléchargement ni inscription.",
        ],
        {
            "/": ["Morpion en ligne - Gratuit, sans téléchargement", "Jouez au morpion en ligne gratuitement. Défiez une IA maligne, invitez un ami par lien ou jouez en multijoueur en temps réel - sans téléchargement ni inscription."],
            "/play-vs-ai": ["Morpion contre l'IA - Adversaire gratuit", "Défiez gratuitement une IA de morpion. Choisissez le mode classique ou le mode Ultimate, plus difficile - sans téléchargement ni inscription."],
            "/play-vs-friend": ["Morpion avec un ami en ligne - Lien d'invitation gratuit", "Invitez un ami à jouer au morpion en ligne en temps réel. Créez une salle, partagez le lien et jouez ensemble depuis deux appareils - gratuit, sans inscription."],
            "/multiplayer": ["Morpion multijoueur - Parties en ligne en temps réel", "Jouez au morpion en ligne en temps réel. Les salles se synchronisent instantanément entre appareils : chaque coup apparaît dès qu'il est joué."],
            "/how-to-play": ["Comment jouer au morpion - Guide du débutant", "Un guide simple, étape par étape : comment se déroulent les tours, comment gagner, et comment utiliser les modes contre l'IA, avec un ami et multijoueur sur ce site."],
            "/tic-tac-toe-rules": ["Règles du morpion - Règles officielles et FAQ", "Les règles officielles complètes du morpion, avec les réponses aux questions courantes : qui commence, que se passe-t-il en cas de nul, et les règles du morpion Ultimate."],
            "/daily-challenge": ["Défi du jour au morpion", "Un nouveau casse-tête de morpion chaque jour, bientôt disponible. Jouez en attendant contre l'IA, avec des amis ou en ligne."],
            "/leaderboard": ["Classement du morpion", "Un classement mondial du morpion arrive bientôt, avec les victoires contre l'IA, entre amis et en multijoueur. Voici ce qui est prévu."],
            "/blog": ["Blog - Stratégie, histoire du morpion et jeux par navigateur", "Guides de stratégie, explications sur l'IA et histoire du morpion, ainsi que des articles sur les meilleurs jeux par navigateur et HTML5."],
            "/about": ["À propos de Tic Tac Toe Online", "Tic Tac Toe Online est un jeu gratuit dans le navigateur, sans téléchargement, avec des modes contre l'IA, entre amis et multijoueur en temps réel. Ce que nous construisons et pourquoi."],
            "/contact": ["Nous contacter", "Écrivez à l'équipe de Tic Tac Toe Online : avis, signalements de bugs et demandes publicitaires."],
            "/privacy": ["Politique de confidentialité", "Comment Tic Tac Toe Online collecte, utilise et protège vos données."],
            "/terms": ["Conditions d'utilisation", "Les conditions qui encadrent votre utilisation de Tic Tac Toe Online."],
        }
    ),
    de: build(
        [
            "Tic Tac Toe Online - Kostenlos spielen, ohne Download",
            "Spiele Tic Tac Toe online kostenlos: fordere eine clevere KI heraus, spiele mit einem Freund am selben Gerät oder tritt im Echtzeit-Multiplayer an. Kein Download, keine Anmeldung.",
        ],
        {
            "/": ["Tic Tac Toe online spielen - Kostenlos, ohne Download", "Spiele Tic Tac Toe online kostenlos. Fordere eine clevere KI heraus, lade einen Freund per Link ein oder spiele im Echtzeit-Multiplayer - ohne Download und Anmeldung."],
            "/play-vs-ai": ["Tic Tac Toe gegen die KI - Kostenloser Computergegner", "Fordere kostenlos eine clevere Tic-Tac-Toe-KI heraus. Wähle den klassischen Modus oder das schwierigere Ultimate Tic Tac Toe - ohne Download und Anmeldung."],
            "/play-vs-friend": ["Tic Tac Toe mit Freunden online - Kostenloser Einladungslink", "Lade einen Freund zu Tic Tac Toe in Echtzeit ein. Erstelle einen Raum, teile den Link und spielt auf zwei beliebigen Geräten - kostenlos, ohne Anmeldung."],
            "/multiplayer": ["Tic Tac Toe Multiplayer - Online-Matches in Echtzeit", "Spiele Tic Tac Toe online in Echtzeit. Räume synchronisieren sich sofort zwischen Geräten, jeder Zug erscheint in dem Moment, in dem er gespielt wird."],
            "/how-to-play": ["Wie spielt man Tic Tac Toe - Anleitung für Einsteiger", "Eine einfache Schritt-für-Schritt-Anleitung: wie die Züge ablaufen, wie man gewinnt und wie die Modi gegen die KI, mit Freunden und im Multiplayer auf dieser Seite funktionieren."],
            "/tic-tac-toe-rules": ["Tic-Tac-Toe-Regeln - Offizielle Regeln und FAQ", "Die vollständigen offiziellen Tic-Tac-Toe-Regeln und Antworten auf häufige Fragen: wer anfängt, was bei Unentschieden passiert, und die Regeln von Ultimate Tic Tac Toe."],
            "/daily-challenge": ["Tägliche Tic-Tac-Toe-Herausforderung", "Bald jeden Tag ein neues Tic-Tac-Toe-Rätsel. Bis dahin spiel das normale Spiel gegen die KI, mit Freunden oder online."],
            "/leaderboard": ["Tic-Tac-Toe-Bestenliste", "Bald gibt es eine weltweite Tic-Tac-Toe-Bestenliste mit Siegen gegen die KI, gegen Freunde und im Multiplayer. Das ist geplant."],
            "/blog": ["Blog - Tic-Tac-Toe-Strategie, Geschichte und Browserspiele", "Strategie-Ratgeber, KI-Erklärungen und die Geschichte von Tic Tac Toe, dazu Artikel über die besten Browser- und HTML5-Spiele."],
            "/about": ["Über Tic Tac Toe Online", "Tic Tac Toe Online ist ein kostenloses Browserspiel ohne Download, mit Modi gegen die KI, mit Freunden und im Echtzeit-Multiplayer. Was wir bauen und warum."],
            "/contact": ["Kontakt", "Schreib dem Team von Tic Tac Toe Online - Feedback, Fehlermeldungen und Werbeanfragen."],
            "/privacy": ["Datenschutzerklärung", "Wie Tic Tac Toe Online deine Daten erhebt, nutzt und schützt."],
            "/terms": ["Nutzungsbedingungen", "Die Bedingungen für die Nutzung von Tic Tac Toe Online."],
        }
    ),
    pt: build(
        [
            "Tic Tac Toe Online - Jogue grátis, sem download",
            "Jogue jogo da velha online grátis: desafie uma IA esperta, jogue com um amigo no mesmo aparelho ou dispute partidas multijogador em tempo real. Sem download e sem cadastro.",
        ],
        {
            "/": ["Jogo da velha online - Grátis, sem download", "Jogue jogo da velha online grátis. Desafie uma IA esperta, chame um amigo por link ou jogue multijogador em tempo real - sem download e sem cadastro."],
            "/play-vs-ai": ["Jogo da velha contra a IA - Adversário grátis", "Desafie grátis uma IA de jogo da velha. Escolha o modo clássico ou o Ultimate, mais difícil - sem download e sem cadastro."],
            "/play-vs-friend": ["Jogo da velha com um amigo online - Link de convite grátis", "Convide um amigo para jogar jogo da velha online em tempo real. Crie uma sala, compartilhe o link e joguem em dois aparelhos quaisquer - grátis, sem cadastro."],
            "/multiplayer": ["Jogo da velha multijogador - Partidas online em tempo real", "Jogue jogo da velha online em tempo real. As salas sincronizam na hora entre aparelhos, então cada jogada aparece no momento em que é feita."],
            "/how-to-play": ["Como jogar jogo da velha - Guia para iniciantes", "Um guia simples, passo a passo: como funcionam as jogadas, como vencer e como usar os modos contra a IA, com amigo e multijogador neste site."],
            "/tic-tac-toe-rules": ["Regras do jogo da velha - Regras oficiais e FAQ", "As regras oficiais completas do jogo da velha e respostas para dúvidas comuns: quem começa, o que acontece no empate e as regras do Ultimate."],
            "/daily-challenge": ["Desafio diário de jogo da velha", "Em breve, um novo quebra-cabeça de jogo da velha todo dia. Enquanto isso, jogue contra a IA, com amigos ou online."],
            "/leaderboard": ["Ranking de jogo da velha", "Em breve, um ranking mundial de jogo da velha com vitórias contra a IA, entre amigos e no multijogador. Veja o que está planejado."],
            "/blog": ["Blog - Estratégia, história do jogo da velha e jogos de navegador", "Guias de estratégia, explicações sobre IA e a história do jogo da velha, além de artigos sobre os melhores jogos de navegador e HTML5."],
            "/about": ["Sobre o Tic Tac Toe Online", "O Tic Tac Toe Online é um jogo de navegador grátis e sem download, com modos contra a IA, com amigos e multijogador em tempo real. O que estamos construindo e por quê."],
            "/contact": ["Contato", "Fale com a equipe do Tic Tac Toe Online - opiniões, relatos de bugs e propostas de publicidade."],
            "/privacy": ["Política de privacidade", "Como o Tic Tac Toe Online coleta, usa e protege seus dados."],
            "/terms": ["Termos de uso", "Os termos que regem o uso do Tic Tac Toe Online."],
        }
    ),
    it: build(
        [
            "Tic Tac Toe Online - Gioca gratis, senza download",
            "Gioca a tris online gratis: sfida un'IA furba, gioca con un amico sullo stesso dispositivo o affronta altri giocatori in multiplayer in tempo reale. Niente download, niente registrazione.",
        ],
        {
            "/": ["Tris online - Gratis, senza download", "Gioca a tris online gratis. Sfida un'IA furba, invita un amico con un link o gioca in multiplayer in tempo reale - senza download e senza registrazione."],
            "/play-vs-ai": ["Tris contro l'IA - Avversario gratuito", "Sfida gratis un'IA di tris. Scegli la modalità classica o l'Ultimate, più difficile - senza download e senza registrazione."],
            "/play-vs-friend": ["Tris con un amico online - Link d'invito gratuito", "Invita un amico a giocare a tris online in tempo reale. Crea una stanza, condividi il link e giocate da due dispositivi qualsiasi - gratis, senza registrazione."],
            "/multiplayer": ["Tris multiplayer - Partite online in tempo reale", "Gioca a tris online in tempo reale. Le stanze si sincronizzano subito tra i dispositivi, così ogni mossa appare appena viene giocata."],
            "/how-to-play": ["Come si gioca a tris - Guida per principianti", "Una guida semplice, passo dopo passo: come funzionano i turni, come si vince e come usare le modalità contro l'IA, con un amico e multiplayer su questo sito."],
            "/tic-tac-toe-rules": ["Regole del tris - Regole ufficiali e FAQ", "Le regole ufficiali complete del tris e le risposte alle domande più comuni: chi inizia, cosa succede in caso di pareggio e le regole dell'Ultimate."],
            "/daily-challenge": ["Sfida del giorno a tris", "Presto un nuovo rompicapo di tris ogni giorno. Nel frattempo gioca contro l'IA, con gli amici o online."],
            "/leaderboard": ["Classifica del tris", "Presto una classifica mondiale del tris con le vittorie contro l'IA, tra amici e in multiplayer. Ecco cosa abbiamo in programma."],
            "/blog": ["Blog - Strategia, storia del tris e giochi per browser", "Guide di strategia, spiegazioni sull'IA e la storia del tris, più articoli sui migliori giochi per browser e HTML5."],
            "/about": ["Chi siamo - Tic Tac Toe Online", "Tic Tac Toe Online è un gioco per browser gratuito e senza download, con modalità contro l'IA, con amici e multiplayer in tempo reale. Cosa stiamo costruendo e perché."],
            "/contact": ["Contatti", "Scrivi al team di Tic Tac Toe Online: opinioni, segnalazioni di bug e richieste pubblicitarie."],
            "/privacy": ["Informativa sulla privacy", "Come Tic Tac Toe Online raccoglie, usa e protegge i tuoi dati."],
            "/terms": ["Termini di servizio", "I termini che regolano l'uso di Tic Tac Toe Online."],
        }
    ),
    es: build(
        [
            "Tic Tac Toe Online - Juega gratis, sin descargas",
            "Juega al tres en raya online gratis: reta a una IA lista, juega con un amigo en el mismo dispositivo o compite en multijugador en tiempo real. Sin descargas ni registro.",
        ],
        {
            "/": ["Tres en raya online - Gratis, sin descargas", "Juega al tres en raya online gratis. Reta a una IA lista, invita a un amigo con un enlace o juega en multijugador en tiempo real, sin descargas ni registro."],
            "/play-vs-ai": ["Tres en raya contra la IA - Rival gratuito", "Reta gratis a una IA de tres en raya. Elige el modo clásico o el Ultimate, más difícil, sin descargas ni registro."],
            "/play-vs-friend": ["Tres en raya con un amigo online - Enlace de invitación gratis", "Invita a un amigo a jugar al tres en raya online en tiempo real. Crea una sala, comparte el enlace y jugad desde dos dispositivos cualesquiera, gratis y sin registro."],
            "/multiplayer": ["Tres en raya multijugador - Partidas online en tiempo real", "Juega al tres en raya online en tiempo real. Las salas se sincronizan al instante entre dispositivos, así que cada jugada aparece en cuanto se hace."],
            "/how-to-play": ["Cómo jugar al tres en raya - Guía para principiantes", "Una guía sencilla paso a paso: cómo funcionan los turnos, cómo ganar y cómo usar los modos contra la IA, con un amigo y multijugador en este sitio."],
            "/tic-tac-toe-rules": ["Reglas del tres en raya - Reglas oficiales y preguntas frecuentes", "Las reglas oficiales completas del tres en raya y respuestas a las dudas comunes: quién empieza, qué pasa en un empate y las reglas del Ultimate."],
            "/daily-challenge": ["Reto diario de tres en raya", "Pronto, un nuevo puzle de tres en raya cada día. Mientras tanto, juega contra la IA, con amigos u online."],
            "/leaderboard": ["Clasificación de tres en raya", "Pronto llegará una clasificación mundial de tres en raya con las victorias contra la IA, entre amigos y en multijugador. Esto es lo que preparamos."],
            "/blog": ["Blog - Estrategia, historia del tres en raya y juegos de navegador", "Guías de estrategia, explicaciones sobre IA e historia del tres en raya, además de artículos sobre los mejores juegos de navegador y HTML5."],
            "/about": ["Sobre Tic Tac Toe Online", "Tic Tac Toe Online es un juego de navegador gratis y sin descargas, con modos contra la IA, con amigos y multijugador en tiempo real. Qué estamos creando y por qué."],
            "/contact": ["Contacto", "Escribe al equipo de Tic Tac Toe Online: opiniones, avisos de errores y consultas de publicidad."],
            "/privacy": ["Política de privacidad", "Cómo Tic Tac Toe Online recoge, usa y protege tus datos."],
            "/terms": ["Condiciones del servicio", "Las condiciones que rigen el uso de Tic Tac Toe Online."],
        }
    ),
    nl: build(
        [
            "Tic Tac Toe Online - Gratis spelen, zonder download",
            "Speel boter-kaas-en-eieren online en gratis: daag een slimme AI uit, speel met een vriend op hetzelfde apparaat of speel realtime multiplayer. Geen download, geen account.",
        ],
        {
            "/": ["Boter-kaas-en-eieren online - Gratis, zonder download", "Speel boter-kaas-en-eieren online en gratis. Daag een slimme AI uit, nodig een vriend uit via een link of speel realtime multiplayer - zonder download en zonder account."],
            "/play-vs-ai": ["Boter-kaas-en-eieren tegen de AI - Gratis computertegenstander", "Daag gratis een slimme AI uit. Kies de klassieke modus of het moeilijkere Ultimate - zonder download en zonder account."],
            "/play-vs-friend": ["Boter-kaas-en-eieren met een vriend online - Gratis uitnodigingslink", "Nodig een vriend uit voor een realtime potje boter-kaas-en-eieren. Maak een kamer, deel de link en speel samen op twee apparaten - gratis, zonder account."],
            "/multiplayer": ["Boter-kaas-en-eieren multiplayer - Realtime online potjes", "Speel boter-kaas-en-eieren online in realtime. Kamers synchroniseren direct tussen apparaten, dus elke zet verschijnt meteen."],
            "/how-to-play": ["Hoe speel je boter-kaas-en-eieren - Gids voor beginners", "Een eenvoudige stap-voor-stap-gids: hoe de beurten gaan, hoe je wint en hoe je de modi tegen de AI, met een vriend en multiplayer op deze site gebruikt."],
            "/tic-tac-toe-rules": ["Regels van boter-kaas-en-eieren - Officiële regels en FAQ", "De volledige officiële regels van boter-kaas-en-eieren, plus antwoorden op veelgestelde vragen: wie begint, wat er bij gelijkspel gebeurt en de regels van Ultimate."],
            "/daily-challenge": ["Dagelijkse uitdaging boter-kaas-en-eieren", "Binnenkort elke dag een nieuwe puzzel. Speel ondertussen het gewone spel tegen de AI, met vrienden of online."],
            "/leaderboard": ["Ranglijst boter-kaas-en-eieren", "Binnenkort een wereldwijde ranglijst met overwinningen tegen de AI, tegen vrienden en in multiplayer. Dit staat er op de planning."],
            "/blog": ["Blog - Strategie, geschiedenis en browsergames", "Strategiegidsen, uitleg over AI en de geschiedenis van boter-kaas-en-eieren, plus artikelen over de beste browser- en HTML5-games."],
            "/about": ["Over Tic Tac Toe Online", "Tic Tac Toe Online is een gratis browsergame zonder download, met modi tegen de AI, met vrienden en realtime multiplayer. Wat we bouwen en waarom."],
            "/contact": ["Contact", "Neem contact op met het team van Tic Tac Toe Online - feedback, bugmeldingen en advertentievragen."],
            "/privacy": ["Privacybeleid", "Hoe Tic Tac Toe Online je gegevens verzamelt, gebruikt en beschermt."],
            "/terms": ["Gebruiksvoorwaarden", "De voorwaarden voor het gebruik van Tic Tac Toe Online."],
        }
    ),
    pl: build(
        [
            "Tic Tac Toe Online - graj za darmo, bez pobierania",
            "Graj w kółko i krzyżyk online za darmo: zmierz się ze sprytną SI, zagraj ze znajomym na jednym urządzeniu albo walcz w multiplayerze w czasie rzeczywistym. Bez pobierania i rejestracji.",
        ],
        {
            "/": ["Kółko i krzyżyk online - za darmo, bez pobierania", "Graj w kółko i krzyżyk online za darmo. Zmierz się ze sprytną SI, zaproś znajomego linkiem albo graj w multiplayerze w czasie rzeczywistym - bez pobierania i rejestracji."],
            "/play-vs-ai": ["Kółko i krzyżyk z SI - darmowy przeciwnik", "Zmierz się za darmo ze sprytną SI. Wybierz tryb klasyczny albo trudniejsze Ultimate - bez pobierania i rejestracji."],
            "/play-vs-friend": ["Kółko i krzyżyk ze znajomym online - darmowy link z zaproszeniem", "Zaproś znajomego do gry w kółko i krzyżyk online w czasie rzeczywistym. Utwórz pokój, udostępnij link i grajcie na dowolnych dwóch urządzeniach - za darmo, bez rejestracji."],
            "/multiplayer": ["Kółko i krzyżyk multiplayer - mecze online w czasie rzeczywistym", "Graj w kółko i krzyżyk online w czasie rzeczywistym. Pokoje synchronizują się natychmiast między urządzeniami, więc każdy ruch widać od razu."],
            "/how-to-play": ["Jak grać w kółko i krzyżyk - poradnik dla początkujących", "Prosty poradnik krok po kroku: jak wyglądają tury, jak wygrać i jak korzystać z trybów z SI, ze znajomym i multiplayer na tej stronie."],
            "/tic-tac-toe-rules": ["Zasady kółka i krzyżyka - oficjalne zasady i FAQ", "Pełne oficjalne zasady kółka i krzyżyka oraz odpowiedzi na częste pytania: kto zaczyna, co przy remisie i zasady Ultimate."],
            "/daily-challenge": ["Wyzwanie dnia w kółko i krzyżyk", "Wkrótce codziennie nowa łamigłówka. Na razie graj w zwykłą grę z SI, ze znajomymi albo online."],
            "/leaderboard": ["Ranking kółka i krzyżyka", "Wkrótce światowy ranking z wygranymi z SI, ze znajomymi i w multiplayerze. Oto, co planujemy."],
            "/blog": ["Blog - strategia, historia kółka i krzyżyka i gry przeglądarkowe", "Poradniki strategiczne, wyjaśnienia o SI i historia kółka i krzyżyka, a także artykuły o najlepszych grach przeglądarkowych i HTML5."],
            "/about": ["O Tic Tac Toe Online", "Tic Tac Toe Online to darmowa gra w przeglądarce bez pobierania, z trybami z SI, ze znajomymi i multiplayerem w czasie rzeczywistym. Co tworzymy i dlaczego."],
            "/contact": ["Kontakt", "Napisz do zespołu Tic Tac Toe Online - opinie, zgłoszenia błędów i zapytania reklamowe."],
            "/privacy": ["Polityka prywatności", "Jak Tic Tac Toe Online zbiera, wykorzystuje i chroni twoje dane."],
            "/terms": ["Warunki korzystania", "Warunki korzystania z Tic Tac Toe Online."],
        }
    ),
};
