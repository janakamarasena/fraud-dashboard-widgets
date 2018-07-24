import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import { VictoryPie, VictoryChart, VictoryLegend } from 'victory';
import Grid from '@material-ui/core/Grid';
import './AverageTransactionAmount.css';
import VizG from 'react-vizgrammar';


const SCA = "SCA";
const EXEMPTED = "EXEMPTED";

//query columns
const QC_COUNT = 1;
const QC_AMOUNT = 2;

const QC_DRILL_DOWN_EXEMPT_AVG_AMOUNT = 1;


//query rows
const QR_SCA = 0;
const QR_EXEMPT = 1;

//dynamic queries
const MAIN_QUERY = "select  IF(isSCAApplied =1, 'SCA', 'EXEMPTED') as tra, count(ID) as count, sum(amount) as amount from TransactionsHistory group by tra order by tra desc #";
const DRILL_DOWN_QUERY ="select exemption, round(avg(amount),2) as amount from TransactionsHistory where isSCAApplied = 0 group by exemption #";

class AverageTransactionAmount extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            totCount: 0,
            totAmountAvg: 0,
            scaAmountAvg: 0,
            exemptAmountAvg: 0,
            scaPercent: '0%',
            exemptPercent: '0%',
            data:null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height,
            isExemptDrillDownVisible: false,
            scaTotAmount:0,
            exemptTotAmount:0,
            dataProviderConf:null,
            drillDownData:[]
        };
        this._handleDataReceived = this._handleDataReceived.bind(this);
        this.hasDataChanged = this.hasDataChanged.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.props.glContainer.on('resize', this.handleResize);
        this.toggleDrillDownView = this.toggleDrillDownView.bind(this);

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
                            name: "amount",
                            title: "Average Amount(£)"
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
                "amount"
            ],
            types: [
                "ordinal",
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
        if (!this.state.isExemptDrillDownVisible && this.hasDataChanged(data.data)) {
            let nTotCount = data.data[QR_SCA][QC_COUNT] + data.data[QR_EXEMPT][QC_COUNT];
            let nTotAmount = data.data[QR_SCA][QC_AMOUNT] + data.data[QR_EXEMPT][QC_AMOUNT];
            let nTotAmountAvg = this.getAverage(nTotAmount, nTotCount);
            let nSCAAmountAvg = this.getAverage(data.data[QR_SCA][QC_AMOUNT], data.data[QR_SCA][QC_COUNT]);
            let nExemptAmountAvg = this.getAverage(data.data[QR_EXEMPT][QC_AMOUNT], data.data[QR_EXEMPT][QC_COUNT]);
            let nSCAPercent = this.getPercent(data.data[QR_SCA][QC_COUNT],
                data.data[QR_SCA][QC_COUNT] + data.data[QR_EXEMPT][QC_COUNT]);
            let nExemptPercent = this.getPercent(data.data[QR_EXEMPT][QC_COUNT],
                data.data[QR_SCA][QC_COUNT] + data.data[QR_EXEMPT][QC_COUNT]);
            this.setState({
                totCount: nTotCount,
                totAmountAvg: nTotAmountAvg,
                scaAmountAvg: nSCAAmountAvg,
                exemptAmountAvg: nExemptAmountAvg,
                scaTotAmount:data.data[QR_SCA][QC_AMOUNT],
                exemptTotAmount:data.data[QR_EXEMPT][QC_AMOUNT],
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
        }else if (this.state.isExemptDrillDownVisible && this.hasDataChanged(data.data)) {
            this.setState({
                drillDownData: data.data
            });
        }
    }

    hasDataChanged(data){
        if (!this.state.isExemptDrillDownVisible) {
            if (this.state.scaTotAmount !== data[QR_SCA][QC_AMOUNT] ||
                this.state.exemptTotAmount !== data[QR_EXEMPT][QC_AMOUNT]) {
                return true;
            }
        }else {
            if (this.state.drillDownData.length !== data.length){
                return true;
            }
            for (let i = 0; i < data.length ; i++) {
                if (data[i][QC_DRILL_DOWN_EXEMPT_AVG_AMOUNT] !==
                    this.state.drillDownData[i][QC_DRILL_DOWN_EXEMPT_AVG_AMOUNT]){
                    return true;
                }
            }
        }
    }

    getPercent(val,tot) {
        return this.roundToTwoDecimals((val*100)/tot);
    }

    getAverage(val, count){
        return this.roundToTwoDecimals(val/count);
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
                <div  className="div-style" hidden={this.state.isExemptDrillDownVisible}>
                    <br/>
                    <h1 style={{marginBottom:"76px"}}>£{this.state.totAmountAvg}</h1>
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
                                            <div className="legend-amount">£{this.state.scaAmountAvg}</div>
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item xs={12}>
                                    <Grid container>
                                        <Grid item xs={2}>
                                            <div className="square-blue"></div>
                                        </Grid>
                                        <Grid className="t-align" item xs={10}>
                                            <div className="legend-name">EXEMPTED ({this.state.exemptPercent}%)</div>
                                            <div className="legend-amount">£{this.state.exemptAmountAvg}</div>
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
                    <h2 className="drill-down-title">EXEMPTED</h2>
                    <div style={{margin:"20px"}}>
                        <VizG
                            config={this.drillDownTableConfig}
                            metadata={this.drillDownMetadata}
                            data={this.state.drillDownData}
                            height={this.props.glContainer.height}
                            width={this.props.glContainer.width}
                        />
                    </div>
                </div>
            </div>
        );
    }

}

global.dashboard.registerWidget('AverageTransactionAmount', AverageTransactionAmount);