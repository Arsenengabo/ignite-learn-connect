from playwright.sync_api import sync_playwright
import sys
OUT="/tmp/shots/"
def ctx_for(b, role, vp, dsf):
    c=b.new_context(viewport=vp, device_scale_factor=dsf)
    c.add_init_script(f"localStorage.setItem('demoRole','{role}'); localStorage.setItem('theme','dark');")
    return c
def go(pg):
    pg.goto("http://127.0.0.1:5300/"); pg.wait_for_timeout(3500)
def nav(pg, label):
    pg.get_by_role("button", name=label, exact=True).first.click(); pg.wait_for_timeout(1800)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    # ---- phone, student
    c=ctx_for(b,"student",{"width":390,"height":844},2); pg=c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)[:160]))
    go(pg); pg.screenshot(path=OUT+"phone_home.png")
    nav(pg,"Study"); pg.screenshot(path=OUT+"phone_study.png")
    pg.get_by_text("X-ray production and the X-ray tube").first.click(); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+"phone_summary.png")
    pg.get_by_role("button", name="Back to Study").click(); pg.wait_for_timeout(1000)
    nav(pg,"Chat"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+"phone_chat.png")
    c.close()
    # ---- desktop, teacher
    c=ctx_for(b,"teacher",{"width":1440,"height":900},1); pg=c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)[:160]))
    go(pg); pg.screenshot(path=OUT+"desk_teacher_home.png")
    nav(pg,"Analytics"); pg.wait_for_timeout(1500); pg.screenshot(path=OUT+"desk_analytics.png")
    c.close()
    # ---- desktop, student
    c=ctx_for(b,"student",{"width":1440,"height":900},1); pg=c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)[:160]))
    go(pg); nav(pg,"Study"); pg.screenshot(path=OUT+"desk_study.png")
    pg.get_by_text("X-ray production and the X-ray tube").first.click(); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+"desk_summary.png")
    pg.get_by_role("button", name="Back to Study").click(); pg.wait_for_timeout(800)
    nav(pg,"Quizzes"); pg.screenshot(path=OUT+"desk_quizzes.png")
    c.close()
    print("errors", errs[:5]); b.close()
