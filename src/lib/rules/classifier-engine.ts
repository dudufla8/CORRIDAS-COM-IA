import { RideExtractionData } from '../ai/schema';
import { ClassificadoresTaxiDigital } from '../taxi-digital/types';

export interface RegraClassificadorItem {
  numeroCampo: number;
  nomeExibicao: string;
  descricaoAjuda?: string;
  obrigatorio: boolean;
  tipoPreenchimento: 'EXTRAIDO_IA_REGEX' | 'HERDADO_AUTORIZADO' | 'VALOR_FIXO_CONTRATO' | 'LISTA_SUSPENSA' | 'MANUAL_LIVRE';
  regexPadrao?: string;
  valorFixo?: string;
  opcoesValidas?: string[];
}

export type StatusValidacaoCampo = 'VALIDADO' | 'PENDENTE_OBRIGATORIO' | 'FORMATO_INVALIDO' | 'OPCAO_INVALIDA' | 'OPCIONAL_VAZIO';

export interface ResultadoValidacaoCampo {
  numeroCampo: number;
  chaveCampo: keyof ClassificadoresTaxiDigital;
  nomeExibicao: string;
  valor: string;
  valido: boolean;
  status: StatusValidacaoCampo;
  mensagemErro?: string;
  origemPreenchimento: 'MANUAL' | 'IA_EXTRAIDO' | 'HERDADO_PERFIL' | 'VALOR_FIXO' | 'VAZIO';
}

export interface ResultadoRuleEngine {
  podeDespachar: boolean;
  classificadoresProntos: ClassificadoresTaxiDigital;
  detalhesCampos: ResultadoValidacaoCampo[];
  camposPendentesObrigatorios: ResultadoValidacaoCampo[];
  resumoValores: Record<string, string>;
}

export class ClassifierRuleEngine {
  static executar(
    regras: RegraClassificadorItem[],
    dadosIa?: Partial<RideExtractionData>,
    dadosAutorizado?: any,
    valoresInformadosManual: Record<string, string> = {}
  ): ResultadoRuleEngine {
    const detalhesCampos: ResultadoValidacaoCampo[] = [];
    const classificadoresProntos: ClassificadoresTaxiDigital = {};
    const resumoValores: Record<string, string> = {};

    for (let i = 1; i <= 20; i++) {
      const chaveCampo = `classificador${i}` as keyof ClassificadoresTaxiDigital;
      const regra = regras.find((r) => r.numeroCampo === i);

      let valorFinal = '';
      let origem: ResultadoValidacaoCampo['origemPreenchimento'] = 'VAZIO';

      if (valoresInformadosManual[chaveCampo] !== undefined && valoresInformadosManual[chaveCampo] !== '') {
        valorFinal = valoresInformadosManual[chaveCampo].trim();
        origem = 'MANUAL';
      } else if (regra) {
        switch (regra.tipoPreenchimento) {
          case 'VALOR_FIXO_CONTRATO':
            if (regra.valorFixo) {
              valorFinal = regra.valorFixo.trim();
              origem = 'VALOR_FIXO';
            }
            break;

          case 'HERDADO_AUTORIZADO':
            if (dadosAutorizado) {
              const doMapa = dadosAutorizado.classificadores_padrao?.[chaveCampo];
              if (doMapa) {
                valorFinal = doMapa;
                origem = 'HERDADO_PERFIL';
              } else if (regra.nomeExibicao.toLowerCase().includes('matr') && dadosAutorizado.unique_field) {
                valorFinal = dadosAutorizado.unique_field;
                origem = 'HERDADO_PERFIL';
              } else if (regra.nomeExibicao.toLowerCase().includes('centro') && dadosAutorizado.centro_custo) {
                valorFinal = dadosAutorizado.centro_custo;
                origem = 'HERDADO_PERFIL';
              }
            }
            break;

          case 'EXTRAIDO_IA_REGEX':
            if (dadosIa?.classificadores) {
              const cls = dadosIa.classificadores;
              if (regra.nomeExibicao.toLowerCase().includes('os') || i === 1) {
                valorFinal = cls.codigoOsChamado || '';
              } else if (regra.nomeExibicao.toLowerCase().includes('centro') || i === 2) {
                valorFinal = cls.centroCusto || '';
              } else if (regra.nomeExibicao.toLowerCase().includes('proj') || i === 3) {
                valorFinal = cls.projeto || '';
              } else if (cls.camposPersonalizados?.[chaveCampo]) {
                valorFinal = cls.camposPersonalizados[chaveCampo];
              }

              if (valorFinal) origem = 'IA_EXTRAIDO';
            }
            break;

          default:
            break;
        }
      }

      const obrigatorio = regra ? regra.obrigatorio : false;
      const nomeExibicao = regra ? regra.nomeExibicao : `Classificador ${i}`;
      let valido = true;
      let status: StatusValidacaoCampo = 'VALIDADO';
      let mensagemErro: string | undefined;

      if (!valorFinal) {
        if (obrigatorio) {
          valido = false;
          status = 'PENDENTE_OBRIGATORIO';
          mensagemErro = `O campo "${nomeExibicao}" é obrigatório para este contrato.`;
        } else {
          status = 'OPCIONAL_VAZIO';
        }
      } else {
        if (regra?.regexPadrao) {
          try {
            const rx = new RegExp(regra.regexPadrao);
            if (!rx.test(valorFinal)) {
              valido = false;
              status = 'FORMATO_INVALIDO';
              mensagemErro = `Formato inválido (${regra.regexPadrao}).`;
            }
          } catch (e) {}
        }
      }

      const itemResultado: ResultadoValidacaoCampo = {
        numeroCampo: i,
        chaveCampo,
        nomeExibicao,
        valor: valorFinal,
        valido,
        status,
        mensagemErro,
        origemPreenchimento: origem,
      };

      detalhesCampos.push(itemResultado);
      if (valorFinal) {
        classificadoresProntos[chaveCampo] = valorFinal;
        resumoValores[chaveCampo] = valorFinal;
      }
    }

    const camposPendentesObrigatorios = detalhesCampos.filter((c) => !c.valido);
    return {
      podeDespachar: camposPendentesObrigatorios.length === 0,
      classificadoresProntos,
      detalhesCampos,
      camposPendentesObrigatorios,
      resumoValores,
    };
  }
}
