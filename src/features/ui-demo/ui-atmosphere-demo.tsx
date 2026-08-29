import Image from "next/image";
import "./ui-atmosphere-demo.css";

export function UiAtmosphereDemo() {
  return <main className="ui-atmosphere-demo">
    <div className="ui-atmosphere-demo__mist ui-atmosphere-demo__mist--one" aria-hidden="true" />
    <div className="ui-atmosphere-demo__mist ui-atmosphere-demo__mist--two" aria-hidden="true" />
    <header className="ui-atmosphere-demo__topline">
      <span>傩谱 · 得面档案</span>
      <span>字体与详情页气氛打样</span>
    </header>

    <section className="ui-atmosphere-demo__stage" aria-label="面具详情页视觉打样">
      <div className="ui-atmosphere-demo__title">
        <p>第七面 · 已收录</p>
        <h1>雾中得面</h1>
        <span>魏碑 · 标题文字候选</span>
      </div>

      <div className="ui-atmosphere-demo__mask-wrap">
        <div className="ui-atmosphere-demo__halo" aria-hidden="true" />
        <Image src="/dream-assets/ui/codex/details/abu-mo/main-mask.png" alt="阿布摩面具详情示意" width={720} height={960} priority />
      </div>

      <aside className="ui-atmosphere-demo__archive">
        <p className="ui-atmosphere-demo__archive-label">面具档案</p>
        <h2>阿布摩</h2>
        <p className="ui-atmosphere-demo__utility">方正聚珍新仿 · 功能文字候选</p>
        <p className="ui-atmosphere-demo__body">面具从黑雾中显影。左侧暖金光压出木纹，右侧面部留在阴影里；阅读区安静地留在边上，让人先看面，再读它的来处。</p>
        <p className="ui-atmosphere-demo__body-note">思源宋体 Light · 内容文字候选</p>
        <button className="ui-atmosphere-demo__button" type="button">
          <Image src="/dream-assets/ui/demo/ritual-button-wood-gold-v1.png" alt="" aria-hidden="true" width={560} height={160} />
          <span>开始扮演</span>
        </button>
      </aside>
    </section>

    <footer className="ui-atmosphere-demo__legend" aria-label="打样说明">
      <span><i />左侧入光</span>
      <span><i />黑雾留白</span>
      <span><i />右侧阴影</span>
    </footer>
  </main>;
}
