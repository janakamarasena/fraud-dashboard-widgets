import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import { VictoryPie, VictoryChart, VictoryLegend } from 'victory';
import Grid from '@material-ui/core/Grid';
import './TotalPaymentTransactions.css';
import VizG from 'react-vizgrammar';

//query columns
const QC_SCA_COUNT = 0;
const QC_SCA_FRAUD_COUNT = 1;
const QC_SCA_AMOUNT = 2;
const QC_EXEMPT_COUNT = 3;
const QC_EXEMPT_FRAUD_COUNT = 4;
const QC_EXEMPT_AMOUNT = 5;

const QC_DRILL_DOWN_EXEMPT_AMOUNT = 1;
const QC_DRILL_DOWN_EXEMPT_COUNT = 2;
const QC_DRILL_DOWN_EXEMPT_PERCENTAGE = 3;

//dynamic queries
const MAIN_QUERY = "SELECT (select count(ID) from TransactionsHistory where isSCAApplied =1) as scaCount, (select count(ID) from TransactionsHistory where isSCAApplied =1 and isFraud = 1) as scaFraudCount,(select round(sum(amount), 2) from TransactionsHistory where isSCAApplied =1) as scaAmount, (select count(ID) from TransactionsHistory where isSCAApplied =0) as exemptCount, (select count(ID) from TransactionsHistory where isSCAApplied =0 and isFraud = 1) as exemptFraudCount,  (select round(sum(amount), 2) from TransactionsHistory where isSCAApplied =0) as exemptAmount FROM TransactionsHistory limit 1 #";
const DRILL_DOWN_QUERY ="SELECT a.exemption, round(sum(amount),2) as amount, count(ID)as count, round(((select count(ID) from TransactionsHistory b where a.exemption=b.exemption  )*100)/(select count(ID) from TransactionsHistory limit 1),2) as percentage, round(((select count(ID) from TransactionsHistory b where a.exemption=b.exemption and  b.isFraud = 1 )*100)/(select count(ID) from TransactionsHistory limit 1),2) as rate FROM TransactionsHistory a where isSCAApplied = 0 group by exemption #";

class TotalPaymentTransactions extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            totCount: 0,
            totAmount: 0,
            totFraudRate: 0,
            scaCount: 0,
            scaAmount: 0,
            scaFraudRate: 0,
            exemptCount: 0,
            exemptAmount: 0,
            exemptFraudRate: 0,
            scaPercent: '0%',
            exemptPercent: '0%',
            isExemptDrillDownVisible: false,
            data:null,
            dataProviderConf: null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height,
            drillDownData:[],
            drillDownExemptionAmount:0,
            drillDownExemptionCount:0,
            drillDownExemptionPercentage:0

        };
        this._handleDataReceived = this._handleDataReceived.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.toggleDrillDownView = this.toggleDrillDownView.bind(this);
        this.props.glContainer.on('resize', this.handleResize);

        this.tableConfig = {
            charts: [
                {
                    type: "arc",
                    x: "percent",
                    color: "name",
                    colorScale:["#00FF85","#0085FF"],
                    mode: "donut"

                }
            ],
            append: false,
            legend: false
        };

        this.drillDownTableConfig  = {
            x: "month",
            charts: [
                {
                    type: "table",
                    columns: [
                        {
                            name: "exemption",
                            title: "Exemption"
                        },
                        {
                            name: "count",
                            title: "Transactions"
                        },
                        {
                            name: "amount",
                            title: "Amount(£)"
                        },
                        {
                            name: "percentage",
                            title: "Percentage"
                        },
                        {
                            name: "rate",
                            title: "Fraud Rate(%)"
                        }
                    ]
                }
            ],
            legend: false,
            append: false
        };

        this.drillDownMetadata = {
            names: [
                "exemption",
                "amount",
                "count",
                "percentage",
                "rate"
            ],
            types: [
                "ordinal",
                "linear",
                "linear",
                "linear",
                "linear"
            ]
        };

    }

    handleResize() {
        this.setState({width: this.props.glContainer.width, height: this.props.glContainer.height});
    }


    componentDidMount() {
      //  super.subscribe(this.setReceivedMsg);
        super.getWidgetConfiguration(this.props.widgetID)
            .then((message) => {
                this.setState({
                    dataProviderConf :  message.data.configs.providerConfig
                });
                super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, message.data.configs.providerConfig);
            })
            .catch((error) => {
                console.log("error", error);
            });

    }
    _handleDataReceived(data) {
        //console.log(data);
        if (!this.state.isExemptDrillDownVisible) {
            let nTotAmount = data.data[0][QC_SCA_AMOUNT] + data.data[0][QC_EXEMPT_AMOUNT];
            if (nTotAmount !== this.state.totAmount) {
                let nSCAPercent = this.getPercent(data.data[0][QC_SCA_COUNT], data.data[0][QC_SCA_COUNT], data.data[0][QC_EXEMPT_COUNT]);
                let nExemptPercent = this.getPercent(data.data[0][QC_EXEMPT_COUNT], data.data[0][QC_SCA_COUNT], data.data[0][QC_EXEMPT_COUNT]);
                let nTotCount = data.data[0][QC_SCA_COUNT] + data.data[0][QC_EXEMPT_COUNT];
                let nTotFraudRate = this.getFraudRate(data.data[0][QC_SCA_FRAUD_COUNT] + data.data[0][QC_EXEMPT_FRAUD_COUNT], nTotCount);
                let nSCAFraudRate = this.getFraudRate(data.data[0][QC_SCA_FRAUD_COUNT], data.data[0][QC_SCA_COUNT]);
                let nExemptFraudRate = this.getFraudRate(data.data[0][QC_EXEMPT_FRAUD_COUNT], data.data[0][QC_EXEMPT_COUNT]);
                this.setState({
                    totCount: nTotCount,
                    totAmount: nTotAmount,
                    totFraudRate: nTotFraudRate,
                    scaCount: data.data[0][QC_SCA_COUNT],
                    scaAmount: data.data[0][QC_SCA_AMOUNT],
                    scaFraudRate: nSCAFraudRate,
                    exemptCount: data.data[0][QC_EXEMPT_COUNT],
                    exemptAmount: data.data[0][QC_EXEMPT_AMOUNT],
                    exemptFraudRate: nExemptFraudRate,
                    scaPercent: nSCAPercent,
                    exemptPercent: nExemptPercent,
                    data: [
                        {
                            x: 1,
                            y: nSCAPercent
                        },
                        {
                            x: 2,
                            y: nExemptPercent
                        }
                    ]
                });

            }
        }else {
            let nDrillDownExemptionAmount = this.getDrillDownExemptionAmount(data.data);
            if (this.state.drillDownExemptionAmount !== nDrillDownExemptionAmount) {
                let nDrillDownExemptionCount = this.getDrillDownExemptionCount(data.data);
                let nDrillDownExemptionPercentage = this.getDrillDownExemptionPercentage(data.data);
                this.setState({
                    drillDownData: data.data,
                    drillDownExemptionAmount:nDrillDownExemptionAmount,
                    drillDownExemptionCount:nDrillDownExemptionCount,
                    drillDownExemptionPercentage:nDrillDownExemptionPercentage
                });
            }
        }
    }

    getPercent(val,totSCA, totExempted) {
        return this.roundToTwoDecimals((val*100)/(totSCA+totExempted));
    }

    getFraudRate(valFraud,valTot) {
        return this.roundToTwoDecimals((valFraud*100)/valTot);
    }
    
    getDrillDownExemptionAmount(data){
        let amount = 0;

        for (let i = 0; i < data.length; i++) {
            amount+=data[i][QC_DRILL_DOWN_EXEMPT_AMOUNT];
        }

        return this.roundToTwoDecimals(amount);
    }
    
    getDrillDownExemptionCount(data){
        let count = 0;

        for (let i = 0; i < data.length; i++) {
            count+=data[i][QC_DRILL_DOWN_EXEMPT_COUNT];
        }

        return count;
    }

    getDrillDownExemptionPercentage(data){
        let percentage = 0;

        for (let i = 0; i < data.length; i++) {
            percentage+=data[i][QC_DRILL_DOWN_EXEMPT_PERCENTAGE];
        }

        return this.roundToTwoDecimals(percentage);
    }

    roundToTwoDecimals(num){
        return Math.round(num * 100) / 100
    }

    toggleDrillDownView(val){
        this.setState({
            isExemptDrillDownVisible:val
        });

        let providerConfig = _.cloneDeep(this.state.dataProviderConf);
        if (val===true) {
            providerConfig.configs.config.queryData.query = DRILL_DOWN_QUERY;
        }else {
            providerConfig.configs.config.queryData.query = MAIN_QUERY;
        }
        super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, providerConfig);

    }

    render() {

        return (
            <div>
               <div className="div-style" hidden={this.state.isExemptDrillDownVisible}>
                    <br/>
                    <h1>£{this.state.totAmount}</h1>
                    <h3 className="tot-amount-style">{this.state.totCount} TRANSACTIONS</h3>
                    <div className="fraud-rate">{this.state.totFraudRate}% (FRAUD RATE)</div>
                    <br/>
                    <br/>
                    <Grid container spacing={24}>
                        <Grid item xs={7}>
                            <svg viewBox="45 28 280 230" >
                                <VictoryPie
                                    standalone={false}
                                    data={this.state.data}
                                    height={230}
                                    innerRadius={82}
                                    labels={(d) =>``}
                                    colorScale={["#00FF85","#0085FF" ]}
                                    animate={{duration: 100}}
                                    events={[{
                                        target: "data",
                                        eventHandlers: {
                                            onClick: (e,d) => {
                                                return d.index==1?this.toggleDrillDownView(true):null
                                            }
                                        }
                                    }]}
                                />
                            </svg>
                        </Grid>
                        <Grid item xs={5}>
                            <Grid style={{marginTop:"2px"}} container direction={"column"} spacing={24}>
                                <Grid item xs={12} style={{marginTop:"-12px"}}>
                                    <Grid container>
                                        <Grid item xs={2}>
                                        <div className="square-green"></div>
                                        </Grid>
                                        <Grid className="t-align" item xs={10}>
                                            <div className="legend-name">SCA ({this.state.scaPercent}%)</div>
                                            <div className="legend-amount">£{this.state.scaAmount}</div>
                                            <div className="legend-count">{this.state.scaCount} transactions</div>
                                            <div className="legend-fraud-rate">{this.state.scaFraudRate}% (fraud rate)</div>
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item xs={12} >
                                    <Grid container>
                                        <Grid item xs={2}>
                                            <div className="square-blue"></div>
                                        </Grid>
                                        <Grid className="t-align" item xs={10}>
                                            <div className="legend-name">EXEMPTED ({this.state.exemptPercent}%)</div>
                                            <div className="legend-amount">£{this.state.exemptAmount}</div>
                                            <div className="legend-count">{this.state.exemptCount} transactions</div>
                                            <div className="legend-fraud-rate">{this.state.exemptFraudRate}% (fraud rate)</div>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                   <p className="click-tip">
                       * Click on the Exempt slice to get a drill down view.
                   </p>
                </div>
                <div className="div-style" hidden={!this.state.isExemptDrillDownVisible}>
                    <div onClick={() => this.toggleDrillDownView(false)} className="drill-down-close">&times;</div>
                    <br/>
                    <h2>EXEMPTED ({this.state.drillDownExemptionPercentage}%)</h2>
                    <h3 className="drill-down-sub-title-1">{this.state.drillDownExemptionCount} TRANSACTIONS</h3>
                    <h3 className="drill-down-sub-title-2">£{this.state.drillDownExemptionAmount}</h3>
                    <div style={{margin:"20px"}}>
                        <VizG
                            config={this.drillDownTableConfig}
                            metadata={this.drillDownMetadata}
                            data={this.state.drillDownData}
                            height={this.props.glContainer.height}
                            width={this.props.glContainer.width}
                        />
                    </div>
                    {/*<p className="info-tip">*/}
                        {/** % - Percentage in respect of the total number of payment transactions.*/}
                    {/*</p>*/}
                </div>
            </div>
        );
    }

}

global.dashboard.registerWidget('TotalPaymentTransactions', TotalPaymentTransactions);