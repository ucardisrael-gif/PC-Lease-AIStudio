from pathlib import Path
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

root=Path('contracts_for_legal_review')
for kind in ('rental','leasing'):
    doc=Document(root / f'computer_{kind}_he_expanded.docx')
    seen=set()
    for p in doc.paragraphs:
        text=p.text
        new=None
        if kind=='rental' and 'אופן ספירת יום המסירה ויום ההחזרה:' in text:
            new=text.replace('אופן ספירת יום המסירה ויום ההחזרה: __________.', 'ימי השכירות נמנים כימים קלנדריים, כולל יום תחילת השכירות ויום סיומה, ללא תלות בשעת המסירה. לדוגמה, מהיום הראשון ועד היום השביעי באותו חודש, כולל שני התאריכים, הם שבעה ימים. מועד ושעת המסירה וההחזרה יתואמו בנפרד. איחור במסירה או באיסוף מצד החברה לא יגדיל אוטומטית את החיוב ללקוח; ייערך חישוב בהתאם לנסיבות ולדין.')
            seen.add('days')
        if text.startswith('משך הבדיקה, אופן מסירת ממצאים'):
            new='בדיקת הציוד תושלם בתוך שבעה ימי עבודה מהמועד שבו החברה קיבלה אותו. תוצאות הבדיקה ודרישה כלשהי יימסרו ללקוח באופן מתועד, יחד עם פירוט ואסמכתאות זמינות. במקרה של מחלוקת תינתן ללקוח אפשרות להשיב; הליך בירור המחלוקת: __________. איחור או אי החזרה יטופלו לפי ההסכם והדין, ללא קנס אוטומטי בטיוטה זו.'
            seen.add('inspection')
        if kind=='rental' and text.startswith('החלק שאינו שנוי במחלוקת יוחזר'):
            new='בתוך שבעה ימי עבודה מהמועד שבו החברה קיבלה את הציוד יושלמו הבדיקה והחזרת החלק שאינו שנוי במחלוקת מן הפיקדון, או תיזום החברה את שחרור החלק האמור של מסגרת האשראי השמורה, בכפוף לדין. אין בהליך בירור מחלוקת על חלק מהבטוחה כדי לעכב את החלק שאינו שנוי במחלוקת. השחרור בפועל של מסגרת אשראי תלוי גם בבנק.'
            seen.add('deposit')
        if text.startswith('אם מתבקשת עבודה שאינה כלולה'):
            new='השירות הכלול, ללא תשלום נוסף, כולל אבחון ותיקון של תקלות חומרה רגילות שהתגלו בשימוש תקין; טיפול במטען תקול שנמסר עם הציוד; תמיכה טלפונית או מרחוק; ושחזור מערכת ההפעלה שהותקנה בידי החברה. החלפת סוללה תקולה כלולה כאשר מתקיים קריטריון מצב הסוללה שיוסכם מראש בנספח: __________. אי יכולת להחזיק טעינה תיבדק; סף מדיד נוסף טרם סוכם. זכויות הלקוח לפי דין אינן תלויות בקביעת הסף.'
            seen.add('service')
        if kind=='rental' and text.startswith('אופן ספירת ימי השכירות, בדיקת הציוד'):
            new='אופן ומועד החזרת תשלום במקרה של סיום מוקדם __________; הסדר בירור מחלוקת על הבטוחה __________; קריטריון מצב הסוללה __________.'
            seen.add('appendix')
        if new is not None:
            p.runs[0].text=new
            for run in p.runs[1:]: run.text=''
        if 'service' in seen and text.startswith('אם מתבקשת עבודה שאינה כלולה'):
            clone=OxmlElement('w:p'); p._p.addnext(clone)
            from docx.text.paragraph import Paragraph
            q=Paragraph(clone,p._parent); q.alignment=p.alignment
            qpr=q._p.get_or_add_pPr(); qpr.append(OxmlElement('w:bidi'))
            r=q.add_run('נזק מקרי, נזקי נוזלים, אביזרים שאבדו, שחזור קבצים אישיים, רישיונות בתשלום, התקנת תוכנות צד שלישי וביקור טכנאי אינם כלולים אוטומטית; האחריות והתשלום ייבחנו לפי הנסיבות, ההסכם והדין. עבודה שאינה כלולה תתומחר מראש ותבוצע לאחר הסכמת הלקוח, אלא אם הדין קובע אחרת. עלויות הובלה לתיקון או ביקור יוסכמו בנפרד, בכפוף להתחייבות החברה לאיסוף והחזרה בליסינג ולדין.')
            rpr=r._r.get_or_add_rPr(); rpr.append(OxmlElement('w:rtl')); r.font.name='Arial'; rpr.rFonts.set(qn('w:cs'),'Arial')
    expected={'inspection','service'} | ({'days','deposit','appendix'} if kind=='rental' else set())
    if seen != expected: raise ValueError(f'{kind}: expected {expected}, found {seen}')
    doc.save(root / f'computer_{kind}_he_service_update.docx')
