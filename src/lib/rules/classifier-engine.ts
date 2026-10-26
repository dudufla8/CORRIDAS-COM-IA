import { RideExtractionData } from '../ai/schema';
import { ClassificadoresTaxiDigital } from '../taxi-digital/types';

export interface RegraClassificadorItem {
  numeroCampo: number; // 0 para NOME / dsNomeSolicitante, 1 a 20 para classificador1..20
  nomeExibicao: string;
  descricaoAjuda?: string;
  obrigatorio: boolean;
  tipoPreenchimento: 'EXTRAIDO_IA_NOME' | 'EXTRAIDO_IA_REGEX' | 'HERDADO_AUTORIZADO' | 'VALOR_FIXO_CONTRATO' | 'LISTA_SUSPENSA' | 'MANUAL_LIVRE';
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
  opcoesValidas?: string[];
  tipoPreenchimento?: string;
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

    // 1. Processar Campo NOME (dsNomeSolicitante) se existir nas regras do contrato
    const regraNome = regras.find((r) => r.numeroCampo === 0 || r.tipoPreenchimento === 'EXTRAIDO_IA_NOME');
    if (regraNome) {
      const chaveNome: keyof ClassificadoresTaxiDigital = 'nomeSolicitante';
      let valorNome = '';
      let origemNome: ResultadoValidacaoCampo['origemPreenchimento'] = 'VAZIO';

      if (valoresInformadosManual[chaveNome] !== undefined && valoresInformadosManual[chaveNome] !== '') {
        valorNome = valoresInformadosManual[chaveNome].trim();
        origemNome = 'MANUAL';
      } else if (dadosIa?.passageiro?.nome) {
        valorNome = dadosIa.passageiro.nome.trim();
        origemNome = 'IA_EXTRAIDO';
      } else if (dadosAutorizado?.client_name) {
        valorNome = dadosAutorizado.client_name.trim();
        origemNome = 'HERDADO_PERFIL';
      }

      let valido = true;
      let status: StatusValidacaoCampo = 'VALIDADO';
      let mensagemErro: string | undefined;

      if (!valorNome) {
        if (regraNome.obrigatorio) {
          valido = false;
          status = 'PENDENTE_OBRIGATORIO';
          mensagemErro = `O campo "${regraNome.nomeExibicao}" é obrigatório para este contrato.`;
        } else {
          status = 'OPCIONAL_VAZIO';
        }
      }

      const itemNome: ResultadoValidacaoCampo = {
        numeroCampo: 0,
        chaveCampo: chaveNome,
        nomeExibicao: regraNome.nomeExibicao,
        valor: valorNome,
        valido,
        status,
        mensagemErro,
        origemPreenchimento: origemNome,
        opcoesValidas: regraNome.opcoesValidas,
        tipoPreenchimento: regraNome.tipoPreenchimento,
      };

      detalhesCampos.push(itemNome);
      if (valorNome) {
        classificadoresProntos[chaveNome] = valorNome;
        resumoValores[chaveNome] = valorNome;
      }
    }

    // 2. Processar Classificadores Numéricos (1 a 20)
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

          case 'LISTA_SUSPENSA':
            if (regra.valorFixo) {
              valorFinal = regra.valorFixo.trim();
              origem = 'VALOR_FIXO';
            } else if (regra.opcoesValidas && regra.opcoesValidas.length > 0) {
              // Verificar se a IA encontrou alguma das opções
              const textoIa = `${dadosIa?.empresaIdentificada || ''} ${dadosIa?.classificadores?.centroCusto || ''} ${dadosIa?.classificadores?.codigoOsChamado || ''}`.toLowerCase();
              const encontrada = regra.opcoesValidas.find((op) => textoIa.includes(op.toLowerCase()));
              if (encontrada) {
                valorFinal = encontrada;
                origem = 'IA_EXTRAIDO';
              } else {
                valorFinal = regra.opcoesValidas[0];
                origem = 'VALOR_FIXO';
              }
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
              if (regra.nomeExibicao.toLowerCase().includes('os') || regra.nomeExibicao.toLowerCase().includes('voucher') || i === 1) {
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
        opcoesValidas: regra?.opcoesValidas,
        tipoPreenchimento: regra?.tipoPreenchimento,
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
