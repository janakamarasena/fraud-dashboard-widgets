import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import { VictoryPie, VictoryChart, VictoryLegend } from 'victory';
import Grid from '@material-ui/core/Grid';
import './TotalPaymentTransactions.css';

 
class TotalPaymentTransactions extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            totCount: 0,
            totAmount: 0,
            scaCount: 0,
            scaAmount: 0,
            exemptCount: 0,
            exemptAmount: 0,
            scaPercent: '0%',
            exemptPercent: '0%',
            data:null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height

        };
        this._handleDataReceived = this._handleDataReceived.bind(this);
       // this.handleResize = this.handleResize.bind(this);

        //this.props.glContainer.on('resize', this.handleResize);

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

    }

    // handleResize() {
    //     this.setState({width: this.props.glContainer.width, height: this.props.glContainer.height});
    // }

    componentDidMount() {
      //  super.subscribe(this.setReceivedMsg);
        super.getWidgetConfiguration(this.props.widgetID)
            .then((message) => {
                super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, message.data.configs.providerConfig);
            })
            .catch((error) => {
                console.log("error", error);
            });

    }
    _handleDataReceived(data) {
        console.log(data);
        console.log(data.data[0]);
        this.setState({tot:data.data[0].toString()});
        let nTotCount = data.data[0][0];

        if (nTotCount > this.state.totCount){
            let scaPercent =  this.getPercent(data.data[0][2],data.data[0][0]);
            let exemptPercent = this.getPercent(data.data[0][4],data.data[0][0]);
            this.setState({
                totCount: data.data[0][0],
                totAmount: data.data[0][1],
                scaCount: data.data[0][2],
                scaAmount: data.data[0][3],
                exemptCount: data.data[0][4],
                exemptAmount: data.data[0][5],
                scaPercent: scaPercent,
                exemptPercent: exemptPercent,
                data: [
                    {
                        x: 1,
                        y: scaPercent
                    },
                    {
                        x: 2,
                        y: exemptPercent
                    }
                ]
            });

            console.log(this.state.data);
        }
    }

    getPercent(val,tot) {
        return (val*100)/tot;
    }
 
    render() {
        return (
            <div  className="div-style">
                <br/>
                <h1>£{this.state.totAmount}</h1>
                <h3 className="tot-amount-style">{this.state.totCount} TRANSACTIONS</h3>
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
                            />
                        </svg>
                    </Grid>
                    <Grid item xs={5}>
                        <Grid style={{marginTop:"2px"}} container direction={"column"} spacing={24}>
                            <Grid item xs={12}>
                                <Grid container>
                                    <Grid item xs={2}>
                                    <div className="square-green"></div>
                                    </Grid>
                                    <Grid className="t-align" item xs={10}>
                                        <div className="legend-name">SCA ({this.state.scaPercent}%)</div>
                                        <div className="legend-amount">£{this.state.scaAmount}</div>
                                        <div className="legend-count">{this.state.scaCount} transactions</div>
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
                                        <div className="legend-amount">£{this.state.exemptAmount}</div>
                                        <div className="legend-count">{this.state.exemptCount} transactions</div>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </div>
        );
    }

}

global.dashboard.registerWidget('TotalPaymentTransactions', TotalPaymentTransactions);