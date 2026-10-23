from pathlib import Path
import argparse,subprocess,os,shutil,zipfile,datetime,hashlib,json

parser=argparse.ArgumentParser();parser.add_argument('--web-project',required=True);parser.add_argument('--tools',required=True);args=parser.parse_args()
root=Path(__file__).resolve().parent;web=Path(args.web_project).resolve();tools=Path(args.tools).resolve()
java=Path(os.environ['JAVA_HOME'])/'bin';sdk=tools/'build-tools-35.0.0'/'android-15';android=tools/'platforms-android-35'/'android-35'/'android.jar'
stage=Path(os.environ['LOCALAPPDATA'])/'ResearchSpaceBuild'/datetime.datetime.now().strftime('%Y%m%d-%H%M%S');stage.mkdir(parents=True)
classes=stage/'classes';classes.mkdir();dex=stage/'dex';dex.mkdir();generated=stage/'generated';generated.mkdir();assets=stage/'assets';assets.mkdir()
source=web/'outputs'/'mobile-web'
if not (source/'index.html').exists():raise RuntimeError('Build the offline web app first')
shutil.copytree(source,assets/'web')
shutil.copytree(root/'app/src/main/res',stage/'res');shutil.copytree(root/'app/src/main/java',stage/'java')
shutil.copy2(root/'app/src/main/AndroidManifest.xml',stage/'AndroidManifest.xml');shutil.copy2(android,stage/'android.jar');android=stage/'android.jar'
def run(*cmd):subprocess.run([str(x) for x in cmd],check=True)
run(sdk/'aapt2.exe','compile','--dir',stage/'res','-o',stage/'resources.zip')
unsigned=stage/'unsigned.apk'
run(sdk/'aapt2.exe','link','-o',unsigned,'-I',android,'--manifest',stage/'AndroidManifest.xml','--java',generated,'-A',assets,stage/'resources.zip')
sources=list((stage/'java').rglob('*.java'))+list(generated.rglob('*.java'))
run(java/'javac.exe','-encoding','UTF-8','-source','8','-target','8','-bootclasspath',str(android)+os.pathsep+str(sdk/'core-lambda-stubs.jar'),'-d',classes,*sources)
run(java/'java.exe','-cp',sdk/'lib/d8.jar','com.android.tools.r8.D8','--lib',android,'--min-api','26','--output',dex,*classes.rglob('*.class'))
canonical=stage/'canonical.apk'
with zipfile.ZipFile(unsigned) as source_zip,zipfile.ZipFile(canonical,'w',zipfile.ZIP_DEFLATED) as z:
 for info in source_zip.infolist():z.writestr(info,source_zip.read(info.filename))
 for item in dex.glob('*.dex'):z.write(item,item.name)
os.replace(canonical,unsigned)
aligned=stage/'aligned.apk';run(sdk/'zipalign.exe','-f','-p','4',unsigned,aligned)
keystore=root/'.local-signing'/'researchspace-release.p12'
if not keystore.exists():run(java/'keytool.exe','-genkeypair','-keystore',keystore,'-storetype','PKCS12','-alias','researchspace','-keyalg','RSA','-keysize','3072','-sigalg','SHA256withRSA','-validity','10000','-dname','CN=ResearchSpace Personal, O=Personal Workspace','-storepass:env','RESEARCHSPACE_APK_KS_PASS','-keypass:env','RESEARCHSPACE_APK_KS_PASS')
output=root/'outputs';output.mkdir(exist_ok=True);apk=output/'ResearchSpace-1.0.3.apk'
run(java/'java.exe','-jar',sdk/'lib/apksigner.jar','sign','--ks',keystore,'--ks-key-alias','researchspace','--ks-pass','env:RESEARCHSPACE_APK_KS_PASS','--key-pass','env:RESEARCHSPACE_APK_KS_PASS','--out',apk,aligned)
run(java/'java.exe','-jar',sdk/'lib/apksigner.jar','verify','--verbose','--print-certs',apk)
run(sdk/'aapt2.exe','dump','badging',aligned)
info={'name':'ResearchSpace','version':'1.0.3','package':'cn.researchspace.personal','minAndroid':'8.0','bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'builtAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cloud':'https://researchspace-chenxin.cxrboncxygen.chatgpt.site/','offline':True}
(output/'release.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf8')
target=web/'public/downloads';target.mkdir(exist_ok=True);shutil.copy2(apk,target/'researchspace.apk');shutil.copy2(output/'release.json',target/'researchspace.json')
print(json.dumps(info,ensure_ascii=False,indent=2));print(apk)
