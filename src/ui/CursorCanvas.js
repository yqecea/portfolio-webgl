import loop from '../core/Loop.js';

export default class CursorCanvas {
  constructor() {
    this.dpi = window.devicePixelRatio || 1;
    this.container = null;
    this.canvas = null;
    this.ctx = null;

    this.cursor = [0, 0];
    this.targetPos = [0, 0];
    this.speed = [0, 0];

    this.arrowImg = null;
    this.playImg = null;

    this.params = {
      circleSize: 26 * this.dpi,
      circleWidth: 0.9 * this.dpi,
      smooshness: 0.001,
      followingSpeed: 0.16,
      sliderOpenness: 0,
      sliderInTime: 0.3,
      sliderRad: 50 * this.dpi,
      arrowOppenes: 10 * this.dpi,
      aInnerCircleSize: 0,
      imgArrowScale: 0,
      playImgScale: 0,
      playerBgRad: 52 * this.dpi
    };

    this.update = this.update.bind(this);
    this.resize = this.resize.bind(this);
    this.mouseMove = this.mouseMove.bind(this);
    this.mouseLeft = this.mouseLeft.bind(this);
    this.mouseEntered = this.mouseEntered.bind(this);

    this.aIn = this.aIn.bind(this);
    this.aOut = this.aOut.bind(this);
    this.nextProjIn = this.nextProjIn.bind(this);
    this.nextProjOut = this.nextProjOut.bind(this);
    this.vidPlayerIn = this.vidPlayerIn.bind(this);
    this.vidPlayerOut = this.vidPlayerOut.bind(this);
  }

  init(container) {
    if (!container) return;

    this.container = container;
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.arrowImg = document.querySelector('.arrowsvg');
    this.playImg = document.querySelector('.playsvg');

    this.resize();

    window.addEventListener('resize', this.resize);
    window.addEventListener('mousemove', this.mouseMove);
    document.addEventListener('mouseleave', this.mouseLeft);
    document.addEventListener('mouseenter', this.mouseEntered);

    loop.subscribe('cursorCanvasUpdate', this.update);
  }

  resize() {
    if (!this.ctx) return;
    this.dpi = window.devicePixelRatio || 1;
    this.ctx.canvas.width = window.innerWidth * this.dpi;
    this.ctx.canvas.height = window.innerHeight * this.dpi;
  }

  mouseMove(e) {
    this.cursor[0] = e.clientX * this.dpi;
    this.cursor[1] = e.clientY * this.dpi;
  }

  mouseLeft() {
    if (typeof TweenLite !== 'undefined') {
      TweenLite.to(this.params, 0.3, {
        circleSize: 0,
        playImgScale: 0
      });
    }
  }

  mouseEntered() {
    if (typeof TweenLite !== 'undefined') {
      TweenLite.to(this.params, 0.3, {
        circleSize: 26 * this.dpi
      });
    }
  }

  update() {
    if (!this.ctx) return;

    this.targetPos[0] += (this.cursor[0] - this.targetPos[0]) * this.params.followingSpeed;
    this.targetPos[1] += (this.cursor[1] - this.targetPos[1]) * this.params.followingSpeed;

    this.speed[0] = Math.abs(this.cursor[0] - this.targetPos[0]);
    this.speed[1] = Math.abs(this.cursor[1] - this.targetPos[1]);

    const width = this.ctx.canvas.width;
    const height = this.ctx.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    this.drawSlider();
    this.drawCursor();
    this.drawLink();

    if (this.arrowImg) this.drawNextProj();
    if (this.playImg) this.drawPlayer();
  }

  drawCursor() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = '#151515';
    this.ctx.lineWidth = this.params.circleWidth;
    this.ctx.translate(this.targetPos[0], this.targetPos[1]);
    this.ctx.scale(
      1 - this.speed[1] * this.params.smooshness,
      1 - this.speed[0] * this.params.smooshness
    );
    this.ctx.arc(0, 0, this.params.circleSize * (1 - this.params.sliderOpenness), 0, 2 * Math.PI);
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawSlider() {
    this.ctx.translate(this.targetPos[0], this.targetPos[1]);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.params.sliderRad, 0, Math.PI * this.params.sliderOpenness);
    this.ctx.stroke();
    this.ctx.closePath();

    this.ctx.beginPath();
    this.ctx.arc(
      0,
      0,
      this.params.sliderRad,
      Math.PI,
      Math.PI + Math.PI * this.params.sliderOpenness
    );
    this.ctx.stroke();
    this.ctx.closePath();

    this.ctx.scale(this.params.sliderOpenness, this.params.sliderOpenness);

    const h = 20 * this.dpi;
    const w = 20 * this.dpi;

    this.ctx.beginPath();
    this.ctx.moveTo(this.params.arrowOppenes / 2, -h / 2);
    this.ctx.lineTo(this.params.arrowOppenes / 2 + w / 2, 0);
    this.ctx.lineTo(this.params.arrowOppenes / 2, h / 2);
    this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(-this.params.arrowOppenes / 2, -h / 2);
    this.ctx.lineTo(-this.params.arrowOppenes / 2 - w / 2, 0);
    this.ctx.lineTo(-this.params.arrowOppenes / 2, h / 2);
    this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawLink() {
    this.ctx.translate(this.targetPos[0], this.targetPos[1]);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.params.aInnerCircleSize * this.dpi, 0, 2 * Math.PI);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawNextProj() {
    this.ctx.translate(this.targetPos[0], this.targetPos[1]);
    const aspect = this.arrowImg.height / this.arrowImg.width;
    const w = 60 * this.dpi;

    this.ctx.scale(this.params.imgArrowScale, this.params.imgArrowScale);
    this.ctx.drawImage(this.arrowImg, -w / 2, (-w / 2) * aspect, w, w * aspect);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawPlayer() {
    this.ctx.translate(this.targetPos[0], this.targetPos[1]);
    const aspect = this.playImg.height / this.playImg.width;
    const w = 50 * this.dpi;

    this.ctx.scale(this.params.playImgScale, this.params.playImgScale);
    this.ctx.arc(0, 0, this.params.playerBgRad, 0, Math.PI * 2);
    this.ctx.fillStyle = '#E5E3DC';
    this.ctx.fill();
    this.ctx.drawImage(this.playImg, -w / 2, (-w / 2) * aspect, w, w * aspect);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  aIn() {
    if (typeof TweenLite !== 'undefined') {
      TweenLite.to(this.params, this.params.sliderInTime, {
        circleSize: 0
      });
    }
  }

  aOut() {
    if (typeof TweenLite !== 'undefined') {
      TweenLite.to(this.params, this.params.sliderInTime, {
        aInnerCircleSize: 0,
        circleSize: 26 * this.dpi
      });
    }
  }

  nextProjIn() {
    if (typeof TweenLite !== 'undefined') {
      TweenLite.to(this.params, this.params.sliderInTime, {
        imgArrowScale: 1,
        circleSize: 60 * this.dpi
      });
    }
  }

  nextProjOut() {
    if (typeof TweenLite !== 'undefined') {
      TweenLite.to(this.params, this.params.sliderInTime, {
        imgArrowScale: 0,
        circleSize: 26 * this.dpi
      });
    }
  }

  vidPlayerIn() {
    if (typeof TweenLite !== 'undefined') {
      TweenLite.to(this.params, this.params.sliderInTime, {
        playImgScale: 1,
        circleSize: 0
      });
    }
  }

  vidPlayerOut() {
    if (typeof TweenLite !== 'undefined') {
      TweenLite.to(this.params, this.params.sliderInTime, {
        playImgScale: 0,
        circleSize: 26 * this.dpi
      });
    }
  }

  destroy() {
    loop.unsubscribe('cursorCanvasUpdate');
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('mousemove', this.mouseMove);
    document.removeEventListener('mouseleave', this.mouseLeft);
    document.removeEventListener('mouseenter', this.mouseEntered);
  }
}
