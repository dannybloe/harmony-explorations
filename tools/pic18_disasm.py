import struct,sys
SFR={0xF80:'PORTA',0xF81:'PORTB',0xF82:'PORTC',0xF83:'PORTD',0xF84:'PORTE',0xF85:'PORTF',0xF86:'PORTG',
0xF89:'LATA',0xF8A:'LATB',0xF8B:'LATC',0xF8C:'LATD',0xF8D:'LATE',0xF8E:'LATF',0xF8F:'LATG',
0xF92:'TRISA',0xF93:'TRISB',0xF94:'TRISC',0xF95:'TRISD',0xF96:'TRISE',0xF97:'TRISF',0xF98:'TRISG',
0xF9D:'PIE1',0xF9E:'PIR1',0xF9F:'IPR1',0xFA0:'PIE2',0xFA1:'PIR2',0xFA2:'IPR2',
0xFBA:'CCP2CON',0xFBB:'CCPR2L',0xFBC:'CCPR2H',0xFBD:'CCP1CON',0xFBE:'CCPR1L',0xFBF:'CCPR1H',
0xFC0:'ADCON2',0xFC1:'ADCON1',0xFC2:'ADCON0',0xFC3:'ADRESL',0xFC4:'ADRESH',0xFC6:'SSPCON1',0xFC9:'SSPBUF',
0xFCA:'T2CON',0xFCB:'PR2',0xFCC:'TMR2',0xFCD:'T1CON',0xFCE:'TMR1L',0xFCF:'TMR1H',
0xFD0:'RCON',0xFD1:'WDTCON',0xFD3:'OSCCON',0xFD5:'T0CON',0xFD6:'TMR0L',0xFD7:'TMR0H',0xFD8:'STATUS',
0xFD9:'FSR2L',0xFDA:'FSR2H',0xFDB:'PREINC2',0xFDC:'POSTDEC2',0xFDD:'POSTINC2',0xFDE:'PLUSW2',0xFDF:'INDF2',
0xFE0:'BSR',0xFE1:'FSR1L',0xFE2:'FSR1H',0xFE3:'PLUSW1',0xFE4:'PREINC1',0xFE5:'POSTDEC1',0xFE6:'POSTINC1',0xFE7:'INDF1',
0xFE8:'WREG',0xFE9:'FSR0L',0xFEA:'FSR0H',0xFEB:'PLUSW0',0xFEC:'PREINC0',0xFED:'POSTDEC0',0xFEE:'POSTINC0',0xFEF:'INDF0',
0xFF0:'INTCON3',0xFF1:'INTCON2',0xFF2:'INTCON',0xFF3:'PRODL',0xFF4:'PRODH',0xFF5:'TABLAT',
0xFF6:'TBLPTRL',0xFF7:'TBLPTRH',0xFF8:'TBLPTRU',0xFF9:'PCL',0xFFA:'PCLATH',0xFFB:'PCLATU',
0xFFC:'STKPTR',0xFFD:'TOSL',0xFFE:'TOSH',0xFFF:'TOSU'}
SIMPLE={0x0000:'NOP',0x0003:'SLEEP',0x0004:'CLRWDT',0x0005:'PUSH',0x0006:'POP',0x0007:'DAW',
0x0008:'TBLRD*',0x0009:'TBLRD*+',0x000a:'TBLRD*-',0x000b:'TBLRD+*',0x000c:'TBLWT*',0x000d:'TBLWT*+',
0x000e:'TBLWT*-',0x000f:'TBLWT+*',0x0010:'RETFIE',0x0011:'RETFIE FAST',0x0012:'RETURN',0x0013:'RETURN FAST',
0x00ff:'RESET'}
LIT={0x0e:'MOVLW',0x0c:'RETLW',0x0d:'MULLW',0x0f:'ADDLW',0x08:'SUBLW',0x09:'IORLW',0x0a:'XORLW',0x0b:'ANDLW'}
# (base_high, mnemonic, has_d)
DW=[(0x04,'DECF',1),(0x10,'IORWF',1),(0x14,'ANDWF',1),(0x18,'XORWF',1),(0x1c,'COMF',1),
    (0x20,'ADDWFC',1),(0x24,'ADDWF',1),(0x28,'INCF',1),(0x2c,'DECFSZ',1),
    (0x30,'RRCF',1),(0x34,'RLCF',1),(0x38,'SWAPF',1),(0x3c,'INCFSZ',1),
    (0x40,'RRNCF',1),(0x44,'RLNCF',1),(0x48,'INFSNZ',1),(0x4c,'DCFSNZ',1),
    (0x50,'MOVF',1),(0x54,'SUBFWB',1),(0x58,'SUBWFB',1),(0x5c,'SUBWF',1)]
FF=[(0x6e,'MOVWF'),(0x6a,'CLRF'),(0x68,'SETF'),(0x6c,'NEGF'),(0x66,'TSTFSZ'),(0x64,'CPFSEQ'),(0x62,'CPFSGT'),
    (0x60,'CPFSLT'),(0x02,'MULWF')]
BIT={0x8:'BSF',0x9:'BCF',0xa:'BTFSC',0xb:'BTFSS',0x7:'BTG'}
CND={0xE0:'BZ',0xE1:'BNZ',0xE2:'BC',0xE3:'BNC',0xE4:'BOV',0xE5:'BNOV',0xE6:'BN',0xE7:'BNN'}
def fname(f,a):
    if a==0:
        return SFR.get(0xF00|f,'0x%02x'%f) if f>=0x60 else '0x%02x'%f
    return '0x%02x,B'%f
def dis(code,base,i):
    w=struct.unpack_from('<H',code,i)[0]; h=w>>8; lo=w&0xff
    if w in SIMPLE: return SIMPLE[w],1
    if h==0x01: return "MOVLB 0x%x"%(w&0x0f),1
    if h in LIT: return "%s 0x%02x"%(LIT[h],lo),1
    if h==0xEE: 
        w2=struct.unpack_from('<H',code,i+2)[0]
        return "LFSR FSR%d,0x%03x"%((w>>4)&3,((w&0x0f)<<8)|(w2&0xff)),2
    if h in (0xEF,0xEC,0xED):
        w2=struct.unpack_from('<H',code,i+2)[0]
        if (w2>>12)!=0xF: return "??? %04x"%w,1
        k=(((w2&0x0fff)<<8)|lo)*2
        return "%s 0x%05x"%('GOTO' if h==0xEF else 'CALL',k),2
    if (h&0xF0)==0xC0:
        w2=struct.unpack_from('<H',code,i+2)[0]
        s=((h&0x0f)<<8)|lo; dd=w2&0xfff
        return "MOVFF %s,%s"%(SFR.get(s,'0x%03x'%s),SFR.get(dd,'0x%03x'%dd)),2
    if (h&0xF8)==0xD0 or (h&0xF8)==0xD8:
        off=w&0x7ff; off-=0x800 if off&0x400 else 0
        return "%s 0x%05x"%('BRA' if (h&0xF8)==0xD0 else 'RCALL',base+i+2+2*off),1
    if h in CND:
        off=lo-256 if lo>127 else lo
        return "%s 0x%05x"%(CND[h],base+i+2+2*off),1
    if (h>>4) in BIT and 0x70<=h<=0xbf:
        return "%s %s,%d"%(BIT[h>>4],fname(lo,(h>>0)&1 ^ 1 if False else (0 if not (h&1) else 1)),(h>>1)&7),1
    for b,nm in FF:
        if h in (b,b+1): return "%s %s"%(nm,fname(lo,h-b)),1
    for b,nm,_ in DW:
        if b<=h<=b+3:
            d=(h-b)>>1; a=(h-b)&1
            return "%s %s,%s"%(nm,fname(lo,a),'F' if d else 'W'),1
    return "??? %04x"%w,1
if __name__=='__main__':
    f,base,start,cnt=sys.argv[1],int(sys.argv[2],0),int(sys.argv[3],0),int(sys.argv[4])
    code=open(f,'rb').read(); i=start-base; k=0
    while k<cnt and i<len(code)-3:
        t,n=dis(code,base,i)
        print("  %05x: %-11s %s"%(base+i," ".join("%02x"%b for b in code[i:i+2*n]),t))
        i+=2*n; k+=1
