        import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

        const PERF_CONFIG = { detectIntervalMs: 100 };
        const SEQUENCE_CONFIG = { photoWordMs: 1000, photoGapMs: 1200, chapterGapMs: 1200 };
        const FIRST_IMAGE_SRC = "chuong1/1.jpg";

        const subtitle = document.getElementById('subtitle');
        const chapterKicker = document.getElementById('chapter-kicker');
        const chapterTitle = document.getElementById('chapter-title');
        const chapterLine = document.getElementById('chapter-line');
        const chapterPhotos = document.getElementById('chapter-photos');
        const chapterPhoto = document.getElementById('chapter-photo');
        const chapterFan = document.getElementById('chapter-fan');
        const chapterCollage = document.getElementById('chapter-collage');
        const heartBox = document.getElementById('heart-box');
        const memoryStage = document.getElementById('memory-stage');
        const introScreen = document.getElementById('intro-screen');
        const introYes = document.getElementById('intro-yes');
        const introNo = document.getElementById('intro-no');
        const retryModal = document.getElementById('retry-modal');
        const introCard = document.getElementById('intro-card');
        const letterModal = document.getElementById('letter-modal');
        const letterClose = document.getElementById('letter-close');
        const skipLock = document.getElementById('skip-lock');
        const btnChapters = document.getElementById('btn-chapters');
        const btnBookmark = document.getElementById('btn-bookmark');
        const btnFullscreen = document.getElementById('btn-fullscreen');
        const chapterPanel = document.getElementById('chapter-panel');
        const chapterList = document.getElementById('chapter-list');
        const chapterClose = document.getElementById('chapter-close');
        const loadingBar = document.getElementById('loading-bar');
        const loadingPercent = document.getElementById('loading-percent');
        const chapterLoader = document.getElementById('chapter-loader');
        const chapterLoaderBar = document.getElementById('chapter-loader-bar');
        const chapterLoaderText = document.getElementById('chapter-loader-text');
        const fallback = document.getElementById('fallback');
        const fallbackStart = document.getElementById('fallback-start');

        let sequenceTimeout = null;
        let sequenceResolver = null;
        let isSequenceRunning = false;
        let skipRequested = false;
        let currentChapterIndex = 0;

        const BOOKMARK_KEY = "magic-bookmark";

        let handLandmarker = undefined;
        let webcamRunning = false;
        let lastGesture = "NONE";
        let latestLandmarks = null;
        let gestureEnabled = false;

        const video = document.getElementById("webcam");
        const canvasElement = document.getElementById("cam-feedback");
        const canvasCtx = canvasElement.getContext("2d");
        const aiStatus = document.getElementById("ai-status");
        canvasElement.width = 120;
        canvasElement.height = 90;

        if (chapterPhoto) {
            chapterPhoto.fetchPriority = "high";
            chapterPhoto.loading = "lazy";
            chapterPhoto.decoding = "async";
        }

        function toWebpPath(src) {
            return src.replace(/\.(jpe?g|png)$/i, ".webp");
        }

        function setImageWithFallback(img, src) {
            if (!img || !src) return;
            const webp = toWebpPath(src);
            if (webp === src) {
                img.src = src;
                return;
            }
            img.onerror = () => {
                if (img.src.endsWith(".webp")) {
                    img.onerror = null;
                    img.src = src;
                }
            };
            img.src = webp;
        }

        function loadImageWithFallback(src) {
            return new Promise((resolve) => {
                const img = new Image();
                const webp = toWebpPath(src);
                let triedWebp = false;
                if (webp !== src) {
                    triedWebp = true;
                    img.src = webp;
                } else {
                    img.src = src;
                }
                img.onload = () => resolve();
                img.onerror = () => {
                    if (triedWebp) {
                        triedWebp = false;
                        img.src = src;
                        return;
                    }
                    resolve();
                };
            });
        }

        function setLoadingProgress(value, text) {
            if (loadingBar) loadingBar.style.width = `${value}%`;
            if (loadingPercent) {
                loadingPercent.classList.remove('is-updating');
                void loadingPercent.offsetWidth;
                loadingPercent.textContent = `${Math.round(value)}%`;
                loadingPercent.classList.add('is-updating');
            }
            if (text) {
                const loadingText = document.querySelector('.loading-text');
                if (loadingText) loadingText.textContent = text;
            }
        }

        function showChapterLoader() {
            if (!chapterLoader) return;
            chapterLoader.classList.add('is-visible');
            chapterLoader.setAttribute('aria-hidden', 'false');
        }

        function hideChapterLoader() {
            if (!chapterLoader) return;
            chapterLoader.classList.remove('is-visible');
            chapterLoader.setAttribute('aria-hidden', 'true');
        }

        function updateChapterLoader(progress) {
            if (chapterLoaderBar) chapterLoaderBar.style.width = `${progress}%`;
            if (chapterLoaderText) chapterLoaderText.textContent = `${Math.round(progress)}%`;
        }

        const STORY_PART_1 = "Lần đầu tặng quà cho nhau và lần đầu đi date với nhau";
        const STORY_PART_2 = "Bin ghét yêu xa và Na cũng vậy, Lần đầu chạy hơn 100km để tìm em, Anh vẫn run khi gặp em, Rồi anh nhận được món quà là một chậu hoa lego, Em thì nhận dc bó hoa anh tự gói";
        const STORY_PART_3 = "Rồi tụi mình đi PhotoBooth, Về tan ngồi Cf em còn bảo anh đểu cáng k đáng tin, Rồi mình cũng đã yêu nhau được hơn 1 năm, Cảm ơn em vì tất cả, Mãi bên anh em nhé";
        const STORY_PART_4 = "Những lần đi photoboot với nhau";
        const STORY_PART_5 = "sinh nhật 2 đứa";
        const STORY_PART_6 = "những ngày kỉ niệm";
        const STORY_PART_7 = "Những Buổi Đi Chơi Cùng Nhau";

        const STORIES = [
            { title: "Lần Đầu", lyricsRaw: STORY_PART_1, folder: "chuong1", imageCount: 8, imageExt: "jpg" },
            { title: "Lần đầu đi chơi đêm", lyricsRaw: STORY_PART_2, folder: "chuong2", imageCount: 5, imageExt: "jpg" },
            { title: "Ngày Lễ Tình Yêu Cùng Nhau", lyricsRaw: STORY_PART_3, folder: "chuong3", imageCount: 7, imageExt: "jpg" },
            { title: "Những lần đi photoboot với nhau", lyricsRaw: STORY_PART_4, folder: "chuong4", imageCount: 12, imageExt: "jpg" },
            { title: "sinh nhật 2 đứa", lyricsRaw: STORY_PART_5, folder: "chuong5", imageCount: 4, imageExt: "jpg" },
            { title: "những ngày kỉ niệm", lyricsRaw: STORY_PART_6, folder: "chuong6", imageCount: 8, imageExt: "jpg" },
            {
                title: "Chuyến Đi Chơi Cùng Nhau",
                lyricsRaw: STORY_PART_7,
                folder: "chuong7",
                imageCount: 37,
                imageExt: "jpg",
                extraImages: [
                    "Ảnh/z7392932474393_46c43e7deac049ab050f9b5d36315b60.jpg",
                    "Ảnh/z7392932508551_a36b665d387f7c01d91c7cc634744ce7.jpg",
                    "Ảnh/z7392932545602_e24e57b24bed86d8df961013098c0aeb.jpg",
                    "Ảnh/z7392932574056_24ebc7d1de91901faf6ee14c050ca1ee.jpg"
                ]
            }
        ];

        const PHOTO_MESSAGES = [
            [
                "Lần đầu tặng quà cho nhau",
                "Lần đầu tặng quà cho nhau",
                "Lần đầu cùng tổ chức sinh nhật cho bạn",
                "Lần đầu đi date cùng có 1 chút ngại ngùng, e thẹn. Vì lần đầu đi date, cũng như lần đầu nắm tay cậu và sau đó....",
                "Lần đầu đi date cùng có 1 chút ngại ngùng, e thẹn. Vì lần đầu đi date, cũng như lần đầu nắm tay cậu và sau đó....",
                "Lần đầu đi date cùng có 1 chút ngại ngùng, e thẹn. Vì lần đầu đi date, cũng như lần đầu nắm tay cậu và sau đó....",
                "Lần đầu đi date cùng có 1 chút ngại ngùng, e thẹn. Vì lần đầu đi date, cũng như lần đầu nắm tay cậu và sau đó....",
                "Lần đầu đi date cùng có 1 chút ngại ngùng, e thẹn. Vì lần đầu đi date, cũng như lần đầu nắm tay cậu và sau đó...."
            ], // Chương 1
            [
                "Không lên kế hoạch trước chỉ vì nhớ quá nên phóng 310km từ quê ra",
                "Tuy chỉ gặp đc vỏn vẹn từ 10h sáng đến 8h tối",
                "Lúc gần phải về quê thì nỗi nhớ càng lớn",
                "Vì những thứ cậu làm cho tớ càng khiến tớ yêu cậu nhiều hơn",
                "Lúc này vẫn rất rất cảm động và rất yêu cậu"
            ], // Chương 2
            [
                "Buổi đi chơi đầu tiên sau khi bọn mình bước vào một mối quan hệ nghiêm túc, lúc đấy tớ muốn tạo ra ấn tượng và 1 sự bất ngờ cho cậu nên tớ đã dùng hết chất sám tung hết mọi hoa tay, lời văn và sự tinh tế để làm ra món quà ấy và bọn mình cũng đã có bức tượng tô chung đầu tiên.",
                "Buổi đi chơi đầu tiên sau khi bọn mình bước vào một mối quan hệ nghiêm túc, lúc đấy tớ muốn tạo ra ấn tượng và 1 sự bất ngờ cho cậu nên tớ đã dùng hết chất sám tung hết mọi hoa tay, lời văn và sự tinh tế để làm ra món quà ấy và bọn mình cũng đã có bức tượng tô chung đầu tiên.",
                "Buổi đi chơi đầu tiên sau khi bọn mình bước vào một mối quan hệ nghiêm túc, lúc đấy tớ muốn tạo ra ấn tượng và 1 sự bất ngờ cho cậu nên tớ đã dùng hết chất sám tung hết mọi hoa tay, lời văn và sự tinh tế để làm ra món quà ấy và bọn mình cũng đã có bức tượng tô chung đầu tiên.",
                "Lúc này là cũng một bất ngờ rất lớn mà cậu dành cho tớ, tớ mọi thứ như đang quá vui đối vs tớ vì cx là lần đầu tiên tớ đc nhận quà từ ngày lễ tình yêu từ 1 người con gái mà tớ rất thích và yêu nên lúc đấy trong tớ cảm thấy uầy thành tích lớn nhất trong cuộc đời mình đây rồi.",
                "Lúc này là cũng một bất ngờ rất lớn mà cậu dành cho tớ, tớ mọi thứ như đang quá vui đối vs tớ vì cx là lần đầu tiên tớ đc nhận quà từ ngày lễ tình yêu từ 1 người con gái mà tớ rất thích và yêu nên lúc đấy trong tớ cảm thấy uầy thành tích lớn nhất trong cuộc đời mình đây rồi.",
                "Lúc này là cũng một bất ngờ rất lớn mà cậu dành cho tớ, tớ mọi thứ như đang quá vui đối vs tớ vì cx là lần đầu tiên tớ đc nhận quà từ ngày lễ tình yêu từ 1 người con gái mà tớ rất thích và yêu nên lúc đấy trong tớ cảm thấy uầy thành tích lớn nhất trong cuộc đời mình đây rồi.",
                "Buổi đi chơi đầu tiên sau khi bọn mình bước vào một mối quan hệ nghiêm túc, lúc đấy tớ muốn tạo ra ấn tượng và 1 sự bất ngờ cho cậu nên tớ đã dùng hết chất sám tung hết mọi hoa tay, lời văn và sự tinh tế để làm ra món quà ấy và bọn mình cũng đã có bức tượng tô chung đầu tiên."
            ], // Chương 3
            [
                "Đây là lần đầu tiên bọn mình rủ nhau cùng đi chụp photobooth, cx hơi hồi hộp nma may là hình vẫn đẹp chắc tại mẫu xịn :>>>",
                "Đây là lần đầu tiên bọn mình rủ nhau cùng đi chụp photobooth, cx hơi hồi hộp nma may là hình vẫn đẹp chắc tại mẫu xịn :>>>",
                "Đây là lần đầu tiên bọn mình rủ nhau cùng đi chụp photobooth, cx hơi hồi hộp nma may là hình vẫn đẹp chắc tại mẫu xịn :>>>",
                "Đây là lần đầu tiên bọn mình rủ nhau cùng đi chụp photobooth, cx hơi hồi hộp nma may là hình vẫn đẹp chắc tại mẫu xịn :>>>",
                "Đây là lần thứ 2 cx là ngày sinh nhật tớ.",
                "Đây là lần thứ 2 cx là ngày sinh nhật tớ.",
                "Đây là lần thứ 4, một lần đi dạo ở triển lãm quân sự thì tìm ra được (May Thật!).",
                "Đây là lần thứ 4, một lần đi dạo ở triển lãm quân sự thì tìm ra được (May Thật!).",
                "Đây là lần thứ 4, một lần đi dạo ở triển lãm quân sự thì tìm ra được (May Thật!).",
                "Đây là lần thứ 3 ở ngay tại PTIT cũng là 1 lần chụp vội nhưng mà được cái ảnh đẹp.",
                "Đây là lần thứ 3 ở ngay tại PTIT cũng là 1 lần chụp vội nhưng mà được cái ảnh đẹp.",
                "Đây là lần thứ 3 ở ngay tại PTIT cũng là 1 lần chụp vội nhưng mà được cái ảnh đẹp."
            ], // Chương 4
            [
                "Ngày 14/3 ngày sinh nhật người bạn gái của tớ.",
                "Ngày 14/3 ngày sinh nhật người bạn gái của tớ.",
                "Ngày 1/5 cảm ơn cậu vì đã tổ chức sinh nhật cho tớ và tặng cho tớ 1 món quà thật đặc biệt",
                "Ngày 1/5 cảm ơn cậu vì đã tổ chức sinh nhật cho tớ và tặng cho tớ 1 món quà thật đặc biệt"
            ], // Chương 5
            [
                "Ngày đi chơi 8/3 mà tớ giành cho cậu",
                "Ngày đi chơi 8/3 mà tớ giành cho cậu",
                "Ngày đi chơi 8/3 mà tớ giành cho cậu",
                "Lần đầu đi hiến máu đôi.",
                "Lần đầu đi hiến máu đôi.",
                "Boy Day mà cậu cbi cho tớ.",
                "Tròn 100 ngày yêu nhau.",
                "Đi chơi 20/10 lại thôi nàoooo...!"
            ], // Chương 6
            [
                "Những chuyến đi chơi cùng nhau khiến mỗi đoạn đường như hát.",
                "Ngồi bên nhau dưới ánh nắng, cười nói về những chuyện nhỏ xíu và ước mơ lớn.",
                "Những lần dạo phố, cùng nhau lạc vào những góc nhỏ của Hà Nội.",
                "Anh luôn nhớ những lần tay trong tay, quên hết mệt mỏi để chỉ thấy yêu thương."
            ]
        ];

        const HeartField = {
            container: null,
            timer: null,
            init() {
                this.container = document.getElementById('heart-field');
            },
            start() {
                if (!this.container || this.timer) return;
                this.spawn();
                const interval = window.innerWidth <= 520 ? 720 : 420;
                this.timer = setInterval(() => this.spawn(), interval);
            },
            spawn() {
                const heart = document.createElement('div');
                const base = window.innerWidth <= 520 ? 10 : 12;
                const size = base + Math.random() * 14;
                const hue = 335 + Math.random() * 20;
                const duration = 4 + Math.random() * 3;
                heart.className = 'heart';
                heart.style.left = `${20 + Math.random() * 60}%`;
                heart.style.fontSize = `${size}px`;
                heart.style.background = `hsl(${hue}, 80%, 65%)`;
                heart.style.setProperty('--dur', `${duration}s`);
                heart.style.setProperty('--x', `${(Math.random() * 2 - 1) * 120}px`);
                this.container.appendChild(heart);
                setTimeout(() => heart.remove(), duration * 1000 + 800);
            }
        };

        const MagicLock = {
            config: {
                smoothFactor: 0.15, orbitSpeed: 0, pulseSpeed: 2, activePulseSpeed: 5,
                colors: { primary: '#ffd700', dim: 'rgba(100, 100, 100, 0.4)', trailStart: 'rgba(255, 215, 0, 0)', trailEnd: 'rgba(255, 250, 220, 0.9)' },
                scale: window.innerWidth <= 520 ? 0.85 : 1,
                offsetX: 0,
                offsetY: window.innerWidth <= 520 ? -0.06 : 0,
                isMobile: window.innerWidth <= 520
            },
            isLocked: true,
            isSequenceActive: false,
            canvas: null, ctx: null,
            points: [
                { x: 0.5, y: 0.22 },
                { x: 0.42, y: 0.16 },
                { x: 0.32, y: 0.18 },
                { x: 0.22, y: 0.3 },
                { x: 0.2, y: 0.46 },
                { x: 0.28, y: 0.6 },
                { x: 0.4, y: 0.7 },
                { x: 0.5, y: 0.82 },
                { x: 0.6, y: 0.7 },
                { x: 0.72, y: 0.6 },
                { x: 0.8, y: 0.46 },
                { x: 0.78, y: 0.3 },
                { x: 0.68, y: 0.18 },
                { x: 0.58, y: 0.16 },
                { x: 0.5, y: 0.22 }
            ],
            currentIndex: 0,
            trail: [], particles: [], connectedPairs: [],
            cursor: { x: 0, y: 0 }, target: { x: 0, y: 0 },

            init() {
                this.canvas = document.getElementById('lock-canvas');
                if(!this.canvas) return;
                this.ctx = this.canvas.getContext('2d');
                this.resize();
                window.addEventListener('resize', () => this.resize());
                this.cursor.x = window.innerWidth / 2;
                this.cursor.y = window.innerHeight / 2;
            },
            resize() {
                if(this.canvas) { 
                    this.canvas.width = window.innerWidth; 
                    this.canvas.height = window.innerHeight; 
                    this.config.scale = window.innerWidth <= 520 ? 0.85 : 1;
                    this.config.offsetY = window.innerWidth <= 520 ? -0.06 : 0;
                    this.config.isMobile = window.innerWidth <= 520;
                }
            },
            update(landmarks) {
                if (!this.ctx || (!this.isLocked && !this.isSequenceActive)) return;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                const time = Date.now();
                const rotationAngle = time * this.config.orbitSpeed;

                if (landmarks && !this.isSequenceActive && this.isLocked) {
                    const indexTip = landmarks[8];
                    this.target.x = (1 - indexTip.x) * this.canvas.width;
                    this.target.y = indexTip.y * this.canvas.height;
                    this.cursor.x += (this.target.x - this.cursor.x) * this.config.smoothFactor;
                    this.cursor.y += (this.target.y - this.cursor.y) * this.config.smoothFactor;
                    this.trail.push({ x: this.cursor.x, y: this.cursor.y });
                    if (this.trail.length > 25) this.trail.shift();
                }

                this.drawTrail();
                this.drawParticles();
                const realPoints = this.points.map(pt => this.getRotatedPoint(pt, rotationAngle));
                this.drawGuideHeart(realPoints);
                this.drawConnections(realPoints);

                realPoints.forEach((pos, idx) => {
                    const isActive = idx < this.currentIndex || this.isSequenceActive;
                    this.drawRune(pos.x, pos.y, isActive, time);
                    if (!this.isSequenceActive && idx === this.currentIndex && this.isLocked) {
                        const dist = Math.hypot(this.cursor.x - pos.x, this.cursor.y - pos.y);
                        const hitRadius = 85 * this.config.scale;
                        if (dist < hitRadius) {
                            this.spawnExplosion(pos.x, pos.y);
                            if (this.currentIndex > 0) this.connectedPairs.push({ from: this.currentIndex - 1, to: this.currentIndex });
                            this.currentIndex++;
                            if (this.currentIndex >= this.points.length) this.triggerUnlock();
                        }
                    }
                });
            },
            drawTrail() {
                if (this.trail.length < 2) return;
                const ctx = this.ctx; ctx.beginPath(); ctx.moveTo(this.trail[0].x, this.trail[0].y);
                for (let i = 1; i < this.trail.length - 2; i++) {
                    const xc = (this.trail[i].x + this.trail[i+1].x) / 2;
                    const yc = (this.trail[i].y + this.trail[i+1].y) / 2;
                    ctx.quadraticCurveTo(this.trail[i].x, this.trail[i].y, xc, yc);
                }
                ctx.quadraticCurveTo(this.trail[this.trail.length-2].x, this.trail[this.trail.length-2].y, this.trail[this.trail.length-1].x, this.trail[this.trail.length-1].y);
                const grad = ctx.createLinearGradient(this.trail[0].x, this.trail[0].y, this.cursor.x, this.cursor.y);
                grad.addColorStop(0, this.config.colors.trailStart); grad.addColorStop(1, this.config.colors.trailEnd);
                ctx.strokeStyle = grad; ctx.lineWidth = 5 * this.config.scale; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
            },
            drawConnections(realPoints) {
                const ctx = this.ctx;
                this.connectedPairs.forEach(pair => {
                    const p1 = realPoints[pair.from]; const p2 = realPoints[pair.to];
                    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = this.isSequenceActive ? '#ffd700' : 'rgba(255, 215, 0, 0.8)';
                    ctx.lineWidth = (this.isSequenceActive ? 5 : 3) * this.config.scale;
                    if (this.isSequenceActive) { ctx.shadowBlur = 12 * this.config.scale; ctx.shadowColor = "#ffd700"; }
                    ctx.stroke(); ctx.shadowBlur = 0;
                });
            },
            drawGuideHeart(realPoints) {
                if (!this.config.isMobile || !realPoints.length) return;
                const ctx = this.ctx;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(realPoints[0].x, realPoints[0].y);
                for (let i = 1; i < realPoints.length - 1; i++) {
                    const curr = realPoints[i];
                    const next = realPoints[i + 1];
                    const midX = (curr.x + next.x) / 2;
                    const midY = (curr.y + next.y) / 2;
                    ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
                }
                const last = realPoints[realPoints.length - 1];
                ctx.lineTo(last.x, last.y);
                ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
                ctx.lineWidth = 3 * this.config.scale;
                ctx.shadowBlur = 18 * this.config.scale;
                ctx.shadowColor = "rgba(255, 215, 0, 0.45)";
                ctx.stroke();
                ctx.restore();
            },
            drawRune(x, y, isActive, time) {
                const ctx = this.ctx; const baseSize = (isActive ? 22 : 15) * this.config.scale;
                const color = isActive ? this.config.colors.primary : this.config.colors.dim;
                const scale = 1 + Math.sin(time * 0.001 * (isActive ? this.config.activePulseSpeed : this.config.pulseSpeed)) * (isActive ? 0.15 : 0.08);
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
                if (this.config.isMobile && !isActive) ctx.globalAlpha = 0.45;
                if (isActive) { ctx.shadowBlur = 20; ctx.shadowColor = color; }
                ctx.beginPath(); ctx.arc(0, 0, baseSize * 1.3, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
                ctx.save(); ctx.rotate(-time * 0.0005); ctx.beginPath(); ctx.arc(0, 0, baseSize * 1.1, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.setLineDash([2, 6]); ctx.lineWidth = 1.2 * this.config.scale; ctx.stroke(); ctx.restore();
                ctx.rotate(time * 0.001 * (isActive ? 2 : 0.5));
                const r = baseSize;
                const drawTri = (offset) => {
                    ctx.beginPath();
                    for(let i=0; i<3; i++) { const a = offset + (i * 120 * Math.PI/180); const tx = r * Math.cos(a); const ty = r * Math.sin(a); if(i===0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty); }
                    ctx.closePath(); ctx.strokeStyle = color; ctx.lineWidth = 1.2 * this.config.scale; ctx.stroke();
                };
                drawTri(0); drawTri(Math.PI);
                ctx.beginPath(); ctx.arc(0, 0, 3 * this.config.scale, 0, Math.PI * 2); ctx.fillStyle = isActive ? '#fff' : color; ctx.fill(); ctx.restore();
            },
            spawnExplosion(x, y) {
                for (let i = 0; i < 40; i++) {
                    const angle = Math.random() * Math.PI * 2; const speed = (Math.random() * 4 + 1) * this.config.scale;
                    this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.0, color: Math.random() > 0.4 ? '#ffd700' : '#ffffff' });
                }
            },
            drawParticles() {
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.03; p.vx *= 0.95; p.vy *= 0.95;
                    if (p.life <= 0) { this.particles.splice(i, 1); }
                    else {
                        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
                        this.ctx.fillStyle = p.color; this.ctx.globalAlpha = p.life; this.ctx.fill(); this.ctx.globalAlpha = 1.0;
                    }
                }
            },
            getRotatedPoint(pt, angle) {
                const cx = 0.5; const cy = 0.5; const scale = this.config.scale;
                const ox = this.config.offsetX || 0;
                const oy = this.config.offsetY || 0;
                const x = (pt.x - cx) * scale; const y = (pt.y - cy) * scale;
                const cos = Math.cos(angle); const sin = Math.sin(angle);
                return { x: ((x * cos - y * sin) + cx + ox) * this.canvas.width, y: ((x * sin + y * cos) + cy + oy) * this.canvas.height };
            },
            triggerUnlock() {
                this.isLocked = true;
                this.isSequenceActive = true;
                document.getElementById('guide-text').style.opacity = 0;
                setTimeout(() => {
                    this.isLocked = false;
                    this.isSequenceActive = false;
                    gestureEnabled = false;
                    lastGesture = "NONE";
                    HeartField.start();
                    heartBox.classList.remove('open');
                    memoryStage.classList.add('is-visible');
                    setStatus("Ra tín hiệu tay để mở");
                    const overlay = document.getElementById('lock-overlay');
                    overlay.style.opacity = 0;
                    setTimeout(() => { overlay.style.display = 'none'; }, 2000);
                    setTimeout(() => { gestureEnabled = true; }, 800);
                }, 900);
            }
        };

        init();

        async function init() {
            HeartField.init();
            MagicLock.init();
            setSubtitleVisible(false);
            setupIntro();
            setupLetterModal();
            setupSkip();
            setupControls();
            setupChapterPanel();
            setupKeyboard();
            const saved = loadBookmark();
            if (saved !== null) currentChapterIndex = saved;
            updateBookmarkButton();
            setLoadingProgress(10, "Đang khởi tạo...");
            loadImageWithFallback(FIRST_IMAGE_SRC);
            await setupAI();
            animate();
        }

        function setupIntro() {
            if (!introScreen || !introYes || !introNo) return;
            const yesLabel = introYes.textContent || "Đồng ý";
            const noLabel = introNo.textContent || "Không đồng ý";
            let swapped = false;
            const acceptIntro = () => {
                introScreen.classList.add('is-hidden');
                setTimeout(() => introScreen.remove(), 700);
            };
            const showRetry = () => {
                if (introCard) {
                    introCard.classList.remove('intro-shake');
                    void introCard.offsetWidth;
                    introCard.classList.add('intro-shake');
                }
                if (!retryModal) return;
                retryModal.classList.add('is-visible');
                retryModal.setAttribute('aria-hidden', 'false');
                setTimeout(() => {
                    retryModal.classList.remove('is-visible');
                    retryModal.setAttribute('aria-hidden', 'true');
                }, 1200);
            };

            introYes.addEventListener('click', acceptIntro);
            introNo.addEventListener('click', showRetry);
        }

        function setupLetterModal() {
            if (!letterModal || !letterClose) return;
            const closeModal = () => {
                letterModal.classList.remove('is-visible');
                letterModal.setAttribute('aria-hidden', 'true');
            };
            letterClose.addEventListener('click', closeModal);
            letterModal.addEventListener('click', (event) => {
                if (event.target === letterModal) closeModal();
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') closeModal();
            });
        }

        function setupSkip() {
            if (!skipLock) return;
            skipLock.addEventListener('click', () => MagicLock.triggerUnlock());
        }

        function setupControls() {
            if (btnChapters) btnChapters.addEventListener('click', openChapterPanel);
            if (btnBookmark) btnBookmark.addEventListener('click', handleBookmarkClick);
            if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);
            if (fallbackStart) fallbackStart.addEventListener('click', handleFallbackStart);
            document.addEventListener('fullscreenchange', updateFullscreenButton);
            updateFullscreenButton();
        }

        function setupChapterPanel() {
            if (chapterClose) chapterClose.addEventListener('click', closeChapterPanel);
            if (chapterPanel) {
                chapterPanel.addEventListener('click', (event) => {
                    if (event.target === chapterPanel) closeChapterPanel();
                });
            }
            renderChapterList();
        }

        function setupKeyboard() {
            document.addEventListener('keydown', (event) => {
                if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
                if (event.key === 'Escape') closeChapterPanel();
                if (event.key === 'c' || event.key === 'C') openChapterPanel();
                if (event.key === 'f' || event.key === 'F') toggleFullscreen();
                if (event.key === 'b' || event.key === 'B') handleBookmarkClick();
                if (event.key === 'ArrowRight') requestSkip();
                if (event.key === 'ArrowLeft') stopSequenceAndReset();
                if (event.key === ' ') {
                    if (!isSequenceRunning) startAutoSequence();
                }
            });
        }

        function openChapterPanel() {
            if (!chapterPanel) return;
            renderChapterList();
            chapterPanel.classList.add('is-visible');
            chapterPanel.setAttribute('aria-hidden', 'false');
        }

        function closeChapterPanel() {
            if (!chapterPanel) return;
            chapterPanel.classList.remove('is-visible');
            chapterPanel.setAttribute('aria-hidden', 'true');
        }

        function renderChapterList() {
            if (!chapterList) return;
            chapterList.innerHTML = "";
            STORIES.forEach((story, index) => {
                const button = document.createElement('button');
                const title = story.title ? ` · ${story.title}` : "";
                button.textContent = `Chương ${index + 1}${title}`;
                if (index === currentChapterIndex) button.classList.add('is-active');
                button.addEventListener('click', () => {
                    closeChapterPanel();
                    startSequenceAt(index);
                });
                chapterList.appendChild(button);
            });
        }

        function loadBookmark() {
            const raw = localStorage.getItem(BOOKMARK_KEY);
            const idx = raw ? Number(raw) : null;
            if (Number.isNaN(idx)) return null;
            return idx;
        }

        function saveBookmark(index) {
            localStorage.setItem(BOOKMARK_KEY, String(index));
            updateBookmarkButton();
        }

        function updateBookmarkButton() {
            if (!btnBookmark) return;
            const saved = loadBookmark();
            if (!isSequenceRunning && saved !== null) {
                btnBookmark.textContent = `Tiếp tục ${saved + 1}`;
                return;
            }
            btnBookmark.textContent = "Đánh dấu";
        }

        function handleBookmarkClick() {
            const saved = loadBookmark();
            if (isSequenceRunning) {
                saveBookmark(currentChapterIndex);
                setStatus(`Đã lưu chương ${currentChapterIndex + 1}`);
                return;
            }
            if (saved !== null) {
                startSequenceAt(saved);
                return;
            }
            saveBookmark(0);
            setStatus("Đã lưu chương 1");
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.();
                return;
            }
            document.exitFullscreen?.();
        }

        function updateFullscreenButton() {
            if (!btnFullscreen) return;
            btnFullscreen.textContent = document.fullscreenElement ? "Thoát" : "Toàn màn hình";
        }

        function showFallback(message) {
            setStatus(message || "Không có camera", "#f7e3bd");
            if (fallback) {
                fallback.classList.add('is-visible');
                fallback.setAttribute('aria-hidden', 'false');
            }
            setLoadingProgress(100, "Không thể dùng camera");
            const loading = document.getElementById('loading-screen');
            if (loading) {
                loading.style.opacity = 0;
                loading.style.pointerEvents = 'none';
            }
        }

        async function handleFallbackStart() {
            if (fallback) {
                fallback.classList.remove('is-visible');
                fallback.setAttribute('aria-hidden', 'true');
            }
            await ensureUnlocked();
            startAutoSequence();
        }

        function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

        async function ensureUnlocked() {
            if (!MagicLock.isLocked) return;
            MagicLock.triggerUnlock();
            await sleep(900);
        }

        async function setupAI() {
            try {
                setLoadingProgress(25, "Đang tải mô hình...");
                const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
                setLoadingProgress(55, "Đang khởi tạo AI...");
                handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`, delegate: "GPU" },
                    runningMode: "VIDEO", numHands: 1
                });
                setLoadingProgress(75, "Đang xin quyền camera...");
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    showFallback("Thiết bị không hỗ trợ camera");
                    return;
                }
                const constraints = { video: { width: { ideal: 640 }, height: { ideal: 360 } } };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                video.srcObject = stream;
                video.addEventListener("loadeddata", () => {
                    webcamRunning = true;
                    setLoadingProgress(100, "Sẵn sàng");
                    const loading = document.getElementById('loading-screen');
                    if (loading) {
                        loading.style.opacity = 0;
                        setTimeout(() => loading.remove(), 1000);
                    }
                    predictWebcam();
                });
            } catch (error) {
                showFallback("Không thể khởi tạo camera");
            }
        }

        function animate() {
            MagicLock.update(latestLandmarks);
            requestAnimationFrame(animate);
        }

        let lastVideoTime = -1;
        let lastDetectTime = 0;
        function predictWebcam() {
            if (!handLandmarker || !webcamRunning) return;
            const now = performance.now();
            if (now - lastDetectTime < PERF_CONFIG.detectIntervalMs) {
                requestAnimationFrame(predictWebcam);
                return;
            }
            lastDetectTime = now;
            let startTimeMs = now;
            if (video.currentTime !== lastVideoTime) {
                lastVideoTime = video.currentTime;
                const results = handLandmarker.detectForVideo(video, startTimeMs);

                canvasCtx.save();
                canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
                canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
                canvasCtx.restore();

                if (results.landmarks && results.landmarks.length > 0) {
                    latestLandmarks = results.landmarks[0];
                    processGestures(latestLandmarks);
                } else {
                    latestLandmarks = null;
                    if (!MagicLock.isLocked && !isSequenceRunning) setStatus("Chờ tín hiệu tay...", "#f2d6a3");
                }
            }
            requestAnimationFrame(predictWebcam);
        }

        function processGestures(landmarks) {
            if (MagicLock.isLocked || !gestureEnabled) return;

            const wrist = landmarks[0];
            const tips = [4, 8, 12, 16, 20];
            const extendedFingers = tips.filter(tip => {
                const dist = Math.sqrt(Math.pow(landmarks[tip].x - wrist.x, 2) + Math.pow(landmarks[tip].y - wrist.y, 2));
                return dist > 0.25; 
            }).length;

            let currentGesture = "NONE";
            const thumbIndexDist = Math.sqrt(Math.pow(landmarks[4].x - landmarks[8].x, 2) + Math.pow(landmarks[4].y - landmarks[8].y, 2));

            if (extendedFingers === 2 && thumbIndexDist > 0.08) currentGesture = "TWO";
            else if (thumbIndexDist < 0.05 && extendedFingers >= 2) currentGesture = "OK";
            else if (extendedFingers >= 4) currentGesture = "OPEN";
            else if (extendedFingers <= 1) currentGesture = "FIST";

            if (currentGesture !== lastGesture) {
                lastGesture = currentGesture;

                if (currentGesture === "OPEN") {
                    setStatus("🖐 Dừng", "#ff9aa7");
                    stopSequenceAndReset();
                } else if (currentGesture === "FIST") {
                    setStatus("✊ Bắt đầu", "#f7e3bd");
                    startAutoSequence();
                } else if (currentGesture === "OK") {
                    setStatus("👌 Bắt đầu", "#f7e3bd");
                    startAutoSequence();
                } else if (currentGesture === "TWO") {
                    setStatus("✌️ Nhanh", "#f7e3bd");
                    requestSkip();
                }
            }
        }

        function startAutoSequence() {
            if (isSequenceRunning) return;
            startSequenceAt(0);
        }

        function stopSequenceAndReset() {
            isSequenceRunning = false;
            clearDelay();
            skipRequested = false;
            heartBox.classList.remove('open');
            setSubtitleVisible(false);
            clearChapterPhotos();
            setPhotosVisible(false);
            memoryStage.classList.remove('is-focused');
            setStatus("Sẵn sàng");
            gestureEnabled = true;
            updateBookmarkButton();
        }

        async function startSequenceAt(chapterIdx) {
            if (!STORIES[chapterIdx]) return;
            await ensureUnlocked();
            if (isSequenceRunning) stopSequenceAndReset();
            isSequenceRunning = true;
            currentChapterIndex = chapterIdx;
            memoryStage.classList.add('is-visible');
            memoryStage.classList.add('is-focused');
            heartBox.classList.add('open');
            setSubtitleVisible(true);
            setPhotosVisible(true);
            runChapterSequence(chapterIdx);
        }

        async function runChapterSequence(chapterIdx) {
            if (!isSequenceRunning) return;
            const story = STORIES[chapterIdx];
            if (!story) return;

            currentChapterIndex = chapterIdx;
            saveBookmark(chapterIdx);
            renderChapterList();
            setChapterHeader(chapterIdx, story.title);
            await preloadChapterImages(story);
            if (!isSequenceRunning) return;
            await playChapterPhotos(story, chapterIdx);
            if (!isSequenceRunning) return;

            if (chapterIdx < STORIES.length - 1) {
                await delay(SEQUENCE_CONFIG.chapterGapMs);
                runChapterSequence(chapterIdx + 1);
            } else {
                setStatus("END", "#f7e3bd");
                isSequenceRunning = false;
                memoryStage.classList.remove('is-focused');
            }
        }

        async function playChapterPhotos(story, chapterIdx) {
            if (!story || !story.imageCount) return;

            if (chapterIdx === 6) {
                showHeartCollage(story);
                await playCollageLines(story, chapterIdx);
                return;
            }

            const messages = normalizeMessages(getPhotoMessages(story, chapterIdx), story.imageCount);
            const groups = buildMessageGroups(messages);
            const imageExt = story.imageExt || "jpg";

            for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                if (!isSequenceRunning) return;
                const group = groups[groupIndex];
                const message = group.message || "";
                if (group.indices.length > 1) {
                    showFanPhotos(story, group.indices, imageExt);
                } else {
                    setChapterPhoto(story, group.indices[0], imageExt);
                }
                if (message) {
                    showLine(message);
                } else {
                    hideLine();
                    chapterLine.textContent = "";
                }
                const duration = Math.max(1, countWords(message)) * SEQUENCE_CONFIG.photoWordMs;
                await delay(duration);
                hideLine();
                if (!isSequenceRunning) return;
                if (groupIndex < groups.length - 1) await delay(SEQUENCE_CONFIG.photoGapMs);
            }
        }

        function getPhotoMessages(story, chapterIdx) {
            const custom = PHOTO_MESSAGES[chapterIdx] || [];
            if (custom.length > 0) return custom;
            return (story.lyricsRaw || "").split(',').map(s => s.trim()).filter(Boolean);
        }

        function buildMessageGroups(messages) {
            const groupMap = new Map();
            const order = [];
            messages.forEach((message, index) => {
                const key = message || "";
                if (!groupMap.has(key)) {
                    groupMap.set(key, []);
                    order.push(key);
                }
                groupMap.get(key).push(index);
            });
            return order.map((key) => ({ message: key, indices: groupMap.get(key) }));
        }

        function countWords(text) {
            return (text || "").trim().split(/\s+/).filter(Boolean).length;
        }

        async function playCollageLines(story, chapterIdx) {
            const lines = getPhotoMessages(story, chapterIdx).filter(Boolean);
            if (lines.length === 0) return;

            for (let i = 0; i < lines.length; i++) {
                if (!isSequenceRunning) return;
                showLine(lines[i]);
                const duration = Math.max(1, countWords(lines[i])) * SEQUENCE_CONFIG.photoWordMs;
                await delay(duration);
                hideLine();
                if (!isSequenceRunning) return;
                if (i < lines.length - 1) await delay(SEQUENCE_CONFIG.photoGapMs);
            }
        }

        function normalizeMessages(messages, count) {
            const result = [];
            const fallback = messages.length > 0 ? messages[messages.length - 1] : "";
            for (let i = 0; i < count; i++) {
                result.push(messages[i] || fallback || "");
            }
            return result;
        }

        function setChapterHeader(index, title) {
            chapterKicker.textContent = `Chương ${index + 1}`;
            chapterTitle.textContent = title || "";
        }

        function setSubtitleVisible(isVisible) {
            if (isVisible) {
                subtitle.classList.add('show');
                return;
            }
            subtitle.classList.remove('show');
            chapterKicker.textContent = "";
            chapterTitle.textContent = "";
            chapterLine.textContent = "";
            chapterLine.classList.remove('is-visible');
        }

        function setPhotosVisible(isVisible) {
            if (isVisible) {
                chapterPhotos.classList.add('is-visible');
                return;
            }
            chapterPhotos.classList.remove('is-visible');
        }

        function setFanMode(isFan) {
            if (isFan) {
                chapterPhotos.classList.add('is-fan');
                return;
            }
            chapterPhotos.classList.remove('is-fan');
        }

        function setCollageMode(isCollage) {
            if (isCollage) {
                chapterPhotos.classList.add('is-collage');
                return;
            }
            chapterPhotos.classList.remove('is-collage');
        }

        function clearChapterPhotos() {
            chapterPhoto.classList.remove('is-visible');
            chapterPhoto.removeAttribute('src');
            chapterPhoto.alt = "";
            chapterFan.innerHTML = "";
            chapterCollage.innerHTML = "";
            setFanMode(false);
            setCollageMode(false);
        }

        function setChapterPhoto(story, index, imageExt) {
            if (!story || !story.folder) return;
            setFanMode(false);
            setCollageMode(false);
            chapterPhoto.classList.remove('is-visible');
            const src = `${story.folder}/${index + 1}.${imageExt}`;
            setImageWithFallback(chapterPhoto, src);
            chapterPhoto.alt = `${story.title || "Chapter"} ${index + 1}`;
            chapterPhoto.onload = () => {
                requestAnimationFrame(() => chapterPhoto.classList.add('is-visible'));
            };
            if (chapterPhoto.complete) {
                requestAnimationFrame(() => chapterPhoto.classList.add('is-visible'));
            }
        }

        function showFanPhotos(story, indices, imageExt) {
            if (!story || !story.folder || indices.length === 0) return;
            setFanMode(true);
            setCollageMode(false);
            chapterFan.innerHTML = "";

            const rect = chapterFan.getBoundingClientRect();
            const width = rect.width || 420;
            const height = rect.height || 300;
            const centerX = width / 2;
            const centerY = height * 0.84;
            const count = indices.length;
            const spread = Math.min(160, 50 + count * 8);
            const start = -spread / 2;
            const step = count > 1 ? spread / (count - 1) : 0;
            const radius = Math.min(width, height) * (0.46 + Math.min(count, 10) * 0.01);

            indices.forEach((index, pos) => {
                const img = document.createElement("img");
                const src = `${story.folder}/${index + 1}.${imageExt}`;
                setImageWithFallback(img, src);
                img.alt = `${story.title || "Chapter"} ${index + 1}`;
                img.loading = "lazy";
                img.decoding = "async";
                img.fetchPriority = "low";
                img.className = "fan-photo";
                const angle = start + (pos * step);
                const rad = (angle * Math.PI) / 180;
                const x = centerX + radius * Math.sin(rad);
                const y = centerY - radius * Math.cos(rad);
                img.style.left = `${(x / width) * 100}%`;
                img.style.top = `${(y / height) * 100}%`;
                img.style.setProperty("--angle", `${angle.toFixed(1)}deg`);
                img.style.zIndex = `${pos + 1}`;
                chapterFan.appendChild(img);
            });
        }

        function showHeartCollage(story) {
            const imageSources = buildChapterImageSources(story);
            if (!story || imageSources.length === 0) return;
            setFanMode(false);
            setCollageMode(true);
            chapterCollage.innerHTML = "";

            const positions = generateHeartPositions(imageSources.length);

            positions.forEach((pos, idx) => {
                const img = document.createElement("img");
                const src = imageSources[idx] || "";
                setImageWithFallback(img, src);
                img.alt = `${story.title || "Chapter"} ${idx + 1}`;
                img.loading = "lazy";
                img.decoding = "async";
                img.fetchPriority = "low";
                img.className = "collage-photo";
                img.style.left = `${pos.x * 100}%`;
                img.style.top = `${pos.y * 100}%`;
                img.style.setProperty("--delay", "0ms");
                img.style.transform = `translate(-50%, -50%) rotate(${(Math.random() * 12 - 6).toFixed(1)}deg)`;
                chapterCollage.appendChild(img);
            });

            const centerText = document.createElement("div");
            centerText.className = "collage-center-text";
            centerText.textContent = "I LOVE YOU";
            chapterCollage.appendChild(centerText);

            const letter = document.createElement("div");
            letter.className = "collage-letter";
            letter.innerHTML = `
                <svg viewBox="0 0 64 48" aria-hidden="true" focusable="false">
                    <rect x="6" y="8" width="52" height="32" rx="6" fill="rgba(248, 237, 220, 0.9)" stroke="rgba(122, 36, 48, 0.8)" stroke-width="2"/>
                    <path d="M8 12 L32 28 L56 12" fill="none" stroke="rgba(122, 36, 48, 0.8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 36 L24 24" fill="none" stroke="rgba(122, 36, 48, 0.6)" stroke-width="2" stroke-linecap="round"/>
                    <path d="M54 36 L40 24" fill="none" stroke="rgba(122, 36, 48, 0.6)" stroke-width="2" stroke-linecap="round"/>
                    <path d="M32 22 c-3.6-4-9.6-3.2-11.2 0.4 c-1.4 3.2 0.8 6.6 4.2 8.4 l7 4.2 l7-4.2 c3.4-1.8 5.6-5.2 4.2-8.4 c-1.6-3.6-7.6-4.4-11.2-0.4z" fill="rgba(185, 42, 59, 0.85)"/>
                </svg>
            `;
            letter.addEventListener('click', () => {
                if (!letterModal) return;
                letterModal.classList.add('is-visible');
                letterModal.setAttribute('aria-hidden', 'false');
            });
            chapterCollage.appendChild(letter);
        }

        function generateHeartPositions(count) {
            const bounds = getHeartBounds();
            const padding = 0.08;
            const positions = [];
            for (let i = 0; i < count; i++) {
                const t = (i / count) * Math.PI * 2;
                const point = heartPoint(t);
                const nx = (point.x - bounds.minX) / (bounds.maxX - bounds.minX);
                const ny = 1 - (point.y - bounds.minY) / (bounds.maxY - bounds.minY);
                const x = padding + (1 - padding * 2) * nx;
                const y = padding + (1 - padding * 2) * ny;
                positions.push({ x, y });
            }
            return positions;
        }

        function heartPoint(t) {
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            return { x, y };
        }

        function getHeartBounds() {
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;
            const samples = 200;
            for (let i = 0; i <= samples; i++) {
                const t = (i / samples) * Math.PI * 2;
                const point = heartPoint(t);
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
            }
            return { minX, maxX, minY, maxY };
        }

        function buildChapterImageSources(story) {
            if (!story) return [];
            const extras = Array.isArray(story.extraImages) ? story.extraImages : [];
            const folderCount = Math.max(0, (story.imageCount || 0) - extras.length);
            const imageExt = story.imageExt || "jpg";
            const sources = [];
            if (story.folder && folderCount > 0) {
                for (let i = 0; i < folderCount; i++) {
                    sources.push(`${story.folder}/${i + 1}.${imageExt}`);
                }
            }
            return sources.concat(extras);
        }

        async function preloadChapterImages(story) {
            if (!story) return;
            const sources = buildChapterImageSources(story);
            if (sources.length === 0) return;
            const limit = window.innerWidth <= 520 ? Math.min(12, sources.length) : Math.min(24, sources.length);
            const targets = sources.slice(0, limit);
            showChapterLoader();
            updateChapterLoader(0);
            let loaded = 0;
            await Promise.all(targets.map((src) => loadImageWithFallback(src).then(() => {
                loaded += 1;
                updateChapterLoader((loaded / targets.length) * 100);
            })));
            await sleep(120);
            hideChapterLoader();
        }

        function showLine(text) {
            if (!text) {
                hideLine();
                return;
            }
            chapterLine.classList.remove('is-visible');
            chapterLine.textContent = text;
            requestAnimationFrame(() => chapterLine.classList.add('is-visible'));
        }

        function hideLine() {
            chapterLine.classList.remove('is-visible');
        }

        function delay(ms) {
            return new Promise(resolve => {
                if (skipRequested) {
                    skipRequested = false;
                    resolve();
                    return;
                }
                sequenceResolver = resolve;
                sequenceTimeout = setTimeout(() => {
                    sequenceTimeout = null;
                    sequenceResolver = null;
                    resolve();
                }, ms);
            });
        }

        function clearDelay() {
            if (sequenceTimeout) {
                clearTimeout(sequenceTimeout);
                sequenceTimeout = null;
            }
            if (sequenceResolver) {
                sequenceResolver();
                sequenceResolver = null;
            }
        }

        function requestSkip() {
            if (!isSequenceRunning) return;
            skipRequested = true;
            clearDelay();
        }

        function setStatus(text, color = "#f2d6a3") {
            if (!aiStatus) return;
            aiStatus.innerText = text;
            aiStatus.style.color = color;
        }
